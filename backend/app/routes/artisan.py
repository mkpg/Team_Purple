from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_artisan, require_verified_artisan
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanProfileUpdate, ArtisanProfileOut
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, SimilarityImageCheck
from app.schemas.quotation import QuotationCreate, QuotationOut
from app.schemas.order import OrderStatusUpdate, OrderOut, ExtensionRequest
from app.services.order_service import OrderService
from app.services.trust_score import get_trust_badge
from app.services.reliability_score import get_reliability_badge, apply_reliability_event
from app.services.image_hashing import (
    build_fingerprint,
    check_exact_duplicate,
    find_similar_designs,
    read_local_upload_bytes,
)
from app.services.transaction_proof import get_order_proof_response

router = APIRouter(prefix="/api/artisan", tags=["Artisan Portal"])


async def _build_image_fingerprint_or_none(image_url: str | None) -> dict:
    image_bytes = read_local_upload_bytes(image_url)
    if not image_bytes:
        return {}
    try:
        return build_fingerprint(image_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fingerprint uploaded product image: {exc}",
        )


async def _raise_if_exact_duplicate(db, fingerprint: dict, current_user: dict, exclude_product_id: str | None = None) -> None:
    sha256_hash = fingerprint.get("sha256_hash")
    if not sha256_hash:
        return

    duplicate = await check_exact_duplicate(db, sha256_hash, exclude_product_id=exclude_product_id)
    if duplicate and str(duplicate.get("artisan_id")) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This exact image matches an existing registered design by another artisan",
                "matched_product_id": str(duplicate["_id"]),
                "matched_artisan_id": str(duplicate.get("artisan_id")),
            },
        )

@router.get("/dashboard")
async def get_artisan_dashboard(current_user: dict = Depends(require_artisan)):
    """Fetch dashboard statistics for the artisan."""
    artisan_oid = current_user["_id"]
    
    requests_coll = get_collection("custom_requests")
    orders_coll = get_collection("orders")
    products_coll = get_collection("products")
    payments_coll = get_collection("payments")
    
    total_requests = await requests_coll.count_documents({"artisan_id": artisan_oid})
    pending_requests = await requests_coll.count_documents({"artisan_id": artisan_oid, "status": "pending"})
    
    total_orders = await orders_coll.count_documents({"artisan_id": artisan_oid})
    active_orders = await orders_coll.count_documents({
        "artisan_id": artisan_oid, 
        "status": {"$nin": ["Delivered", "Completed", "Cancelled"]}
    })
    
    total_products = await products_coll.count_documents({"artisan_id": artisan_oid})
    
    # Calculate total earnings
    pipeline = [
        {"$match": {"artisan_id": artisan_oid, "status": {"$in": ["secured", "paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    cursor = payments_coll.aggregate(pipeline)
    total_earned = 0.0
    async for result in cursor:
        total_earned = result.get("total", 0.0)
        
    recent_orders_cursor = orders_coll.find({"artisan_id": artisan_oid}).sort("updated_at", -1).limit(5)
    recent_orders = await recent_orders_cursor.to_list(length=5)
    
    return {
        "stats": {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "total_orders": total_orders,
            "active_orders": active_orders,
            "total_products": total_products,
            "total_earned": total_earned
        },
        "recent_orders": serialize_list(recent_orders)
    }

@router.get("/profile")
async def get_artisan_profile(current_user: dict = Depends(require_artisan)):
    """Fetch the logged-in artisan's profile."""
    profiles_coll = get_collection("artisan_profiles")
    profile = await profiles_coll.find_one({"user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return serialize_doc(profile)

@router.put("/profile")
async def update_artisan_profile(payload: ArtisanProfileUpdate, current_user: dict = Depends(require_artisan)):
    """Update artisan profile details."""
    profiles_coll = get_collection("artisan_profiles")
    
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
    update_data["updated_at"] = datetime.utcnow()
    
    res = await profiles_coll.update_one(
        {"user_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    updated_profile = await profiles_coll.find_one({"user_id": current_user["_id"]})
    return serialize_doc(updated_profile)

# Verified Artisan Products
@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, current_user: dict = Depends(require_verified_artisan)):
    """Add a new jewellery product to the public store (Verified Artisans only)."""
    products_coll = get_collection("products")
    fingerprint = await _build_image_fingerprint_or_none(payload.image_url)
    await _raise_if_exact_duplicate(products_coll.database, fingerprint, current_user)
    
    new_product = {
        **payload.dict(),
        **fingerprint,
        "artisan_id": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = await products_coll.insert_one(new_product)
    new_product["_id"] = res.inserted_id
    
    return serialize_doc(new_product)

@router.get("/products")
async def get_my_products(current_user: dict = Depends(require_artisan)):
    """List all products belonging to the logged-in artisan."""
    products_coll = get_collection("products")
    products = await products_coll.find({"artisan_id": current_user["_id"]}).to_list(length=100)
    return serialize_list(products)

@router.post("/products/check-image-similarity")
async def check_uploaded_image_similarity(payload: SimilarityImageCheck, current_user: dict = Depends(require_verified_artisan)):
    """Check a newly uploaded image URL before the product is published."""
    products_coll = get_collection("products")
    fingerprint = await _build_image_fingerprint_or_none(payload.image_url)
    if not fingerprint:
        return {
            "status": "unavailable",
            "warnings": [],
            "message": "Fingerprinting is available for uploaded CraftShield images.",
        }

    duplicate = await check_exact_duplicate(products_coll.database, fingerprint["sha256_hash"])
    if duplicate and str(duplicate.get("artisan_id")) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This exact image matches an existing registered design by another artisan",
                "matched_product_id": str(duplicate["_id"]),
                "matched_artisan_id": str(duplicate.get("artisan_id")),
            },
        )

    matches = await find_similar_designs(products_coll.database, fingerprint["phash"])
    matches = [match for match in matches if str(match.get("artisan_id")) != str(current_user["_id"])]
    return {
        "status": "checked",
        "warnings": matches,
        "fingerprint": fingerprint,
    }

@router.put("/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, current_user: dict = Depends(require_verified_artisan)):
    """Update an existing product (Verified Artisans only)."""
    products_coll = get_collection("products")
    
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")
        
    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    if str(product["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product")
        
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    if "image_url" in update_data:
        fingerprint = await _build_image_fingerprint_or_none(update_data.get("image_url"))
        await _raise_if_exact_duplicate(products_coll.database, fingerprint, current_user, exclude_product_id=product_id)
        update_data.update(fingerprint)

    update_data["updated_at"] = datetime.utcnow()
    
    await products_coll.update_one({"_id": prod_oid}, {"$set": update_data})
    
    updated_product = await products_coll.find_one({"_id": prod_oid})
    return serialize_doc(updated_product)

@router.post("/products/{product_id}/check-similarity")
async def check_product_similarity(product_id: str, current_user: dict = Depends(require_verified_artisan)):
    """Read-only duplicate/similarity check for an existing product."""
    products_coll = get_collection("products")

    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")

    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if str(product["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product")

    fingerprint = {
        "sha256_hash": product.get("sha256_hash"),
        "phash": product.get("phash"),
    }
    if not fingerprint["sha256_hash"] or not fingerprint["phash"]:
        computed = await _build_image_fingerprint_or_none(product.get("image_url"))
        fingerprint.update(computed)

    if not fingerprint.get("sha256_hash") or not fingerprint.get("phash"):
        return {
            "status": "unavailable",
            "warnings": [],
            "message": "No computable uploaded image fingerprint is available for this product.",
        }

    duplicate = await check_exact_duplicate(products_coll.database, fingerprint["sha256_hash"], exclude_product_id=product_id)
    if duplicate and str(duplicate.get("artisan_id")) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This exact image matches an existing registered design by another artisan",
                "matched_product_id": str(duplicate["_id"]),
                "matched_artisan_id": str(duplicate.get("artisan_id")),
            },
        )

    matches = await find_similar_designs(products_coll.database, fingerprint["phash"], exclude_product_id=product_id)
    matches = [match for match in matches if str(match.get("artisan_id")) != str(current_user["_id"])]
    return {"status": "checked", "warnings": matches}

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_verified_artisan)):
    """Delete a product (Verified Artisans only)."""
    products_coll = get_collection("products")
    
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")
        
    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    if str(product["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product")
        
    await products_coll.delete_one({"_id": prod_oid})
    return {"message": "Product deleted successfully"}

# Verified Artisan Custom Requests
@router.get("/custom-requests")
async def get_received_custom_requests(current_user: dict = Depends(require_artisan)):
    """Fetch custom requests submitted to the logged-in artisan."""
    requests_coll = get_collection("custom_requests")
    users_coll = get_collection("users")
    
    requests = await requests_coll.find({"artisan_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    
    results = []
    for req in requests:
        client = await users_coll.find_one({"_id": req["client_id"]})
        results.append({
            **serialize_doc(req),
            "client_name": client["full_name"] if client else "Unknown Client",
            "client_trust_badge": get_trust_badge(float((client.get("trust_profile") or {}).get("trust_score", 100.0))) if client else get_trust_badge(100.0)
        })
    return results

@router.put("/custom-requests/{request_id}/accept")
async def accept_custom_request(request_id: str, current_user: dict = Depends(require_verified_artisan)):
    """Accept a received custom request (Verified Artisans only)."""
    requests_coll = get_collection("custom_requests")
    
    try:
        req_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")
        
    req = await requests_coll.find_one({"_id": req_oid})
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom request not found")
        
    if str(req["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request was not sent to you")
        
    if req["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Custom request cannot be accepted from state '{req['status']}'")
        
    await requests_coll.update_one(
        {"_id": req_oid},
        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
    )
    
    req["status"] = "accepted"
    return serialize_doc(req)

@router.put("/custom-requests/{request_id}/reject")
async def reject_custom_request(request_id: str, current_user: dict = Depends(require_verified_artisan)):
    """Reject a received custom request (Verified Artisans only)."""
    requests_coll = get_collection("custom_requests")
    
    try:
        req_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")
        
    req = await requests_coll.find_one({"_id": req_oid})
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom request not found")
        
    if str(req["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request was not sent to you")
        
    if req["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Custom request cannot be rejected from state '{req['status']}'")
        
    await requests_coll.update_one(
        {"_id": req_oid},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )
    
    req["status"] = "rejected"
    return serialize_doc(req)

@router.post("/quotations", status_code=status.HTTP_201_CREATED)
async def create_quotation(payload: QuotationCreate, current_user: dict = Depends(require_verified_artisan)):
    """Send a quotation for an accepted custom request (Verified Artisans only)."""
    requests_coll = get_collection("custom_requests")
    quotations_coll = get_collection("quotations")
    
    try:
        req_oid = ObjectId(payload.custom_request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custom request ID format")
        
    req = await requests_coll.find_one({"_id": req_oid})
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom request not found")
        
    if str(req["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to quote for this request")
        
    if req["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="You can only submit quotations for custom requests that you have accepted first."
        )
        
    new_quot = {
        "custom_request_id": req_oid,
        "artisan_id": current_user["_id"],
        "client_id": req["client_id"],
        "quoted_amount": payload.quoted_amount,
        "advance_amount": payload.advance_amount,
        "expected_completion_date": datetime.combine(payload.expected_completion_date or payload.estimated_delivery_date, datetime.min.time()),
        "estimated_delivery_date": datetime.combine(payload.expected_completion_date or payload.estimated_delivery_date, datetime.min.time()),
        "design_notes": payload.design_notes,
        "status": "sent",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = await quotations_coll.insert_one(new_quot)
    new_quot["_id"] = res.inserted_id
    
    return serialize_doc(new_quot)

# Artisan Orders and status management
@router.get("/orders")
async def get_artisan_orders(current_user: dict = Depends(require_artisan)):
    """Fetch all orders assigned to the artisan."""
    orders_coll = get_collection("orders")
    users_coll = get_collection("users")
    
    orders = await orders_coll.find({"artisan_id": current_user["_id"]}).sort("updated_at", -1).to_list(length=100)
    
    results = []
    for order in orders:
        client = await users_coll.find_one({"_id": order["client_id"]})
        results.append({
            **serialize_doc(order),
            "client_name": client["full_name"] if client else "Unknown Client"
        })
    return results

@router.get("/orders/{order_id}/proof")
async def get_order_transaction_proof(order_id: str, current_user: dict = Depends(require_artisan)):
    """Return the artisan's copy of a verified transaction receipt and QR code."""
    db = get_collection("orders").database
    return await get_order_proof_response(db, order_id, owner_filter={"artisan_id": current_user["_id"]})

@router.post("/orders/{order_id}/request-extension")
async def request_extension(order_id: str, payload: ExtensionRequest, current_user: dict = Depends(require_verified_artisan)):
    orders_coll = get_collection("orders")
    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
    order = await orders_coll.find_one({"_id": order_oid})
    if not order or str(order["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    deadline = order.get("extended_completion_date") or order.get("expected_completion_date")
    if deadline and isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline)
    if deadline and datetime.utcnow() > deadline:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Extension must be requested before the deadline")
    await orders_coll.update_one(
        {"_id": order_oid},
        {"$set": {"extended_completion_date": payload.new_completion_date, "updated_at": datetime.utcnow()}, "$push": {"extension_history": {"reason": payload.reason, "new_completion_date": payload.new_completion_date, "created_at": datetime.utcnow(), "requested_by": str(current_user["_id"])}}}
    )
    await apply_reliability_event(db=get_collection("orders").database, artisan_id=current_user["_id"], event_type="EXTENSION_REQUESTED", order_id=order_oid, note=payload.reason)
    return {"message": "Extension requested and logged", "new_completion_date": payload.new_completion_date}

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate, current_user: dict = Depends(require_verified_artisan)):
    """Update order production or delivery status (Verified Artisans only)."""
    return await OrderService.update_order_status(order_id, payload.status, current_user)

@router.get("/payments")
async def get_payments_received(current_user: dict = Depends(require_artisan)):
    """Fetch payments received by the artisan."""
    payments_coll = get_collection("payments")
    payments = await payments_coll.find({"artisan_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    return serialize_list(payments)

from pydantic import BaseModel

class RegisterDesignRequest(BaseModel):
    override_similarity_warning: bool = False

@router.post("/products/{product_id}/register-design")
async def register_product_design(product_id: str, payload: RegisterDesignRequest = None, current_user: dict = Depends(require_verified_artisan)):
    """Anchor the design fingerprint/hash of a product on-chain (using real or simulated ledger)."""
    override = payload.override_similarity_warning if payload else False
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")

    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if str(product["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product")

    # If already registered, return details immediately
    if product.get("blockchain_registered"):
        return {
            "status": "success",
            "message": "Design already anchored on-chain",
            "tx_id": product.get("blockchain_tx_id"),
            "block_number": product.get("blockchain_block_number"),
            "artisan_address": product.get("blockchain_artisan_address"),
            "registered_at": product.get("blockchain_registered_at"),
            "design_hash": product.get("design_hash"),
            "simulated": product.get("blockchain_simulated", False)
        }

    # Retrieve or build visual fingerprint
    phash = product.get("phash")
    sha256 = product.get("sha256_hash")
    if not phash or not sha256:
        computed = await _build_image_fingerprint_or_none(product.get("image_url"))
        if not computed:
            # Fallback fingerprint if upload isn't readable
            import io
            from PIL import Image
            img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            dummy_bytes = buf.getvalue()
            from app.services.image_hashing import build_fingerprint
            computed = build_fingerprint(dummy_bytes)
        
        phash = computed["phash"]
        sha256 = computed["sha256_hash"]
        await products_coll.update_one({"_id": prod_oid}, {"$set": computed})

    # Check for visual similarity warning matches (phash distance <= 10) with OTHER artisans' products
    matches = await find_similar_designs(products_coll.database, phash, exclude_product_id=product_id)
    matches = [m for m in matches if str(m.get("artisan_id")) != str(current_user["_id"])]

    if matches and not override:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Visual similarity warning: Resembling designs detected. You can override if you believe this is your original design.",
                "warnings": serialize_list(matches)
            }
        )

    # Load image bytes for bundle hashing
    image_bytes = read_local_upload_bytes(product.get("image_url"))
    if not image_bytes:
        image_bytes = f"dummy_bytes_for_product_{product_id}".encode("utf-8")

    from app.services.blockchain import build_design_bundle, compute_design_hash, register_design_onchain
    
    # Construct bundle and hash
    created_at_str = product.get("created_at", datetime.utcnow()).isoformat()
    bundle = build_design_bundle(
        image_bytes=image_bytes,
        product_title=product["name"],
        description=product.get("description", ""),
        artisan_id=str(current_user["_id"]),
        upload_timestamp=created_at_str
    )
    design_hash = compute_design_hash(bundle)

    # Register design on-chain or mock fallback
    result = await register_design_onchain(
        design_hash=design_hash,
        artisan_id=str(current_user["_id"]),
        product_id=str(product["_id"]),
        image_url=product.get("image_url", "")
    )

    # Update product record
    registered_at = datetime.utcnow()
    await products_coll.update_one(
        {"_id": prod_oid},
        {"$set": {
            "blockchain_registered": True,
            "blockchain_tx_id": result["tx_id"],
            "blockchain_block_number": result["block_number"],
            "blockchain_artisan_address": result["artisan_address"],
            "blockchain_registered_at": registered_at,
            "blockchain_simulated": result.get("simulated", False),
            "design_hash": design_hash
        }}
    )

    # If override was True and there were matches, file a dispute
    if matches and override:
        disputes_coll = products_coll.database["disputes"]
        await disputes_coll.insert_one({
            "type": "design_hash_conflict",
            "product_id": prod_oid,
            "product_name": product["name"],
            "artisan_id": current_user["_id"],
            "artisan_name": current_user["full_name"],
            "design_hash": design_hash,
            "conflicting_products": serialize_list(matches),
            "status": "pending",
            "created_at": datetime.utcnow(),
            "note": "Artisan registered a design that has a high similarity score with an existing product using override."
        })

    return {
        "status": "success",
        "message": "Design anchored successfully",
        "tx_id": result["tx_id"],
        "block_number": result["block_number"],
        "artisan_address": result["artisan_address"],
        "registered_at": registered_at,
        "design_hash": design_hash,
        "simulated": result.get("simulated", False)
    }
