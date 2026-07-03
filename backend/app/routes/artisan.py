from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_artisan, require_verified_artisan
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanProfileUpdate, ArtisanProfileOut
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, DesignRegisterPayload
from app.services.image_similarity import compute_phash, find_similar_designs
from app.services.blockchain import build_design_bundle, compute_design_hash, verify_design_onchain, register_design_onchain, get_artisan_wallet
from app.schemas.quotation import QuotationCreate, QuotationOut
from app.schemas.order import OrderStatusUpdate, OrderOut, ExtensionRequest
from app.services.order_service import OrderService

router = APIRouter(prefix="/api/artisan", tags=["Artisan Portal"])

@router.get("/dashboard")
async def get_artisan_dashboard(current_user: dict = Depends(require_artisan)):
    """Fetch dashboard statistics for the artisan."""
    artisan_oid = current_user["_id"]
    
    db = get_collection("users").database
    from app.services.reliability_score import check_delayed_orders
    await check_delayed_orders(db)
    
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
    
    new_product = {
        **payload.dict(),
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
        
    update_data["updated_at"] = datetime.utcnow()
    
    await products_coll.update_one({"_id": prod_oid}, {"$set": update_data})
    
    updated_product = await products_coll.find_one({"_id": prod_oid})
    return serialize_doc(updated_product)

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
            "client_name": client["full_name"] if client else "Unknown Client"
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
        "estimated_delivery_date": datetime.combine(payload.estimated_delivery_date, datetime.min.time()),
        "expected_completion_date": datetime.combine(payload.expected_completion_date, datetime.min.time()),
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
        
        # Calculate delay details
        target_date = order.get("extended_completion_date") or order.get("expected_completion_date")
        is_delayed = False
        delay_days = 0
        
        if target_date:
            from datetime import date
            if isinstance(target_date, date) and not isinstance(target_date, datetime):
                target_date = datetime.combine(target_date, datetime.min.time())
            now = datetime.utcnow()
            if now > target_date:
                is_delayed = True
                delay_days = (now - target_date).days
                
        results.append({
            **serialize_doc(order),
            "client_name": client["full_name"] if client else "Unknown Client",
            "delay_status": {
                "is_delayed": is_delayed,
                "delay_days": delay_days
            }
        })
    return results

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate, current_user: dict = Depends(require_verified_artisan)):
    """Update order production or delivery status (Verified Artisans only)."""
    return await OrderService.update_order_status(order_id, payload.status, current_user)

@router.post("/orders/{order_id}/request-extension")
async def request_order_extension(order_id: str, payload: ExtensionRequest, current_user: dict = Depends(require_verified_artisan)):
    """Submit a request for an expected completion date extension before the current deadline passes."""
    orders_coll = get_collection("orders")
    
    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
        
    order = await orders_coll.find_one({"_id": order_oid})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if str(order["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this order")
        
    if order.get("extension_requested"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An extension has already been requested for this order")
        
    now = datetime.utcnow()
    deadline = order.get("expected_completion_date")
    if deadline:
        from datetime import date
        if isinstance(deadline, date) and not isinstance(deadline, datetime):
            deadline = datetime.combine(deadline, datetime.min.time())
        if now > deadline:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot request extension after expected completion date has passed")
            
    if payload.extended_completion_date <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Extended completion date must be in the future")
        
    await orders_coll.update_one(
        {"_id": order_oid},
        {
            "$set": {
                "extension_requested": True,
                "extended_completion_date": payload.extended_completion_date,
                "extension_reason": payload.reason,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Log 0-delta event in reliability history
    from app.services.reliability_score import apply_reliability_event
    await apply_reliability_event(
        db=orders_coll.database,
        artisan_id=current_user["_id"],
        event_type="EXTENSION_REQUESTED",
        order_id=order_oid,
        note=f"Requested completion extension to {payload.extended_completion_date.strftime('%Y-%m-%d')}. Reason: {payload.reason}"
    )
    
    return {"status": "success", "message": "Extension requested successfully"}

@router.get("/payments")
async def get_payments_received(current_user: dict = Depends(require_artisan)):
    """Fetch payments received by the artisan."""
    payments_coll = get_collection("payments")
    payments = await payments_coll.find({"artisan_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    return serialize_list(payments)

# Helper to read image bytes (either local file, base64 data URI, or HTTP)
import requests
import os
import base64

# Domains that are NOT direct image URLs (search engines, image galleries, etc.)
_BLOCKED_URL_PATTERNS = [
    "google.com/imgres",
    "google.com/search",
    "bing.com/images",
    "pinterest.com",
    "instagram.com",
    "facebook.com",
    "reddit.com",
]

def get_image_bytes(image_url: str) -> bytes:
    if not image_url:
        raise ValueError("Product has no image URL set.")

    # 1. Handle base64 data URIs (data:image/jpeg;base64,...)
    if image_url.startswith("data:"):
        try:
            header, data = image_url.split(",", 1)
            return base64.b64decode(data)
        except Exception as e:
            raise ValueError(f"Invalid base64 image data: {e}")

    # 2. Handle local uploaded files
    if image_url.startswith("/uploads/"):
        filename = os.path.basename(image_url)
        filepath = os.path.join("uploads", filename)
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                return f.read()
        raise ValueError(
            f"Uploaded file '{filename}' not found on disk. "
            "It may have been uploaded to a different server instance."
        )

    # 3. Block known non-direct-image URLs (search pages, social media, etc.)
    url_lower = image_url.lower()
    for blocked in _BLOCKED_URL_PATTERNS:
        if blocked in url_lower:
            raise ValueError(
                f"The image URL appears to be a web search or gallery page, not a direct image file. "
                f"Please use a direct image URL (ending in .jpg, .png, .webp, etc.). "
                f"Blocked pattern detected: '{blocked}'"
            )

    # 4. Fetch via HTTP and validate content-type
    try:
        headers = {"User-Agent": "CraftShield/1.0 (design-proof-system)"}
        resp = requests.get(image_url, timeout=12, headers=headers, stream=True)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        raise ValueError(f"Image URL timed out after 12 seconds: {image_url[:80]}")
    except requests.exceptions.HTTPError as e:
        raise ValueError(f"Image URL returned HTTP error: {e}")
    except requests.exceptions.ConnectionError:
        raise ValueError(f"Cannot connect to image URL. Check the URL is publicly accessible.")

    # Validate content type is an actual image
    content_type = resp.headers.get("Content-Type", "").lower()
    valid_image_types = ["image/", "application/octet-stream"]
    if not any(content_type.startswith(t) for t in valid_image_types):
        raise ValueError(
            f"URL does not point to an image file (Content-Type: '{content_type}'). "
            f"Use a direct image URL ending in .jpg, .png, .webp, .gif, etc."
        )

    image_bytes = resp.content
    if len(image_bytes) < 100:
        raise ValueError("Image file is too small to be a valid image.")

    return image_bytes


@router.post("/products/{product_id}/check-design-similarity")
async def check_design_similarity(product_id: str, current_user: dict = Depends(require_verified_artisan)):
    """Computes the pHash of the product's image and scans the DB for similar designs (does not register)."""
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

    try:
        # Run blocking image fetch and hash generation in threadpool
        from fastapi.concurrency import run_in_threadpool
        image_bytes = await run_in_threadpool(get_image_bytes, product["image_url"])
        new_phash = await run_in_threadpool(compute_phash, image_bytes)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process product image: {str(e)}")

    similar = await find_similar_designs(products_coll.database, new_phash, threshold=10)
    # Filter out self
    matches = [m for m in similar if m["product_id"] != product_id]

    return {
        "phash": new_phash,
        "matches": matches
    }

@router.post("/products/{product_id}/register-design")
async def register_design(product_id: str, payload: DesignRegisterPayload, current_user: dict = Depends(require_verified_artisan)):
    """
    Builds the design bundle, runs duplicate checks, signs/delegates transaction,
    and registers the design timestamp proof on VeChain.
    """
    products_coll = get_collection("products")
    disputes_coll = get_collection("disputes")
    
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")

    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if str(product["artisan_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this product")

    if product.get("design_hash"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Design is already registered on-chain for this product.")

    try:
        from fastapi.concurrency import run_in_threadpool
        image_bytes = await run_in_threadpool(get_image_bytes, product["image_url"])
        
        # pHash and similarity check
        phash = await run_in_threadpool(compute_phash, image_bytes)
        similar = await find_similar_designs(products_coll.database, phash, threshold=10)
        similar = [m for m in similar if m["product_id"] != product_id]
        
        # Build cryptographic bundle and hash
        artisan_id_str = str(product["artisan_id"])
        created_at_dt = product.get("created_at")
        upload_timestamp = created_at_dt.isoformat() if isinstance(created_at_dt, datetime) else datetime.utcnow().isoformat()
        
        bundle = build_design_bundle(
            image_bytes=image_bytes,
            product_title=product["name"],
            description=product.get("description", ""),
            artisan_id=artisan_id_str,
            upload_timestamp=upload_timestamp
        )
        design_hash = compute_design_hash(bundle)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to process design bundle: {str(e)}")

    # 1. Check exact hash duplicate on-chain
    onchain_check = await verify_design_onchain(design_hash)
    if onchain_check:
        artisan_wallet = get_artisan_wallet(artisan_id_str)
        if onchain_check["artisan_address"].lower() != artisan_wallet.getAddress().lower():
            # Create a dispute for duplicate hash theft attempt
            conflict_dispute = {
                "type": "exact_hash_theft_attempt",
                "status": "pending",
                "product_id": prod_oid,
                "artisan_id": current_user["_id"],
                "registered_hash": design_hash,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "description": f"Attempted duplicate registration of design hash {design_hash} already registered by {onchain_check['artisan_address']}."
            }
            await disputes_coll.insert_one(conflict_dispute)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This exact design bundle is already registered by another artisan on-chain."
            )

    # 2. Check near-duplicate pHash similarity warning
    if similar and not payload.override_similarity_warning:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "near_duplicate_found",
                "message": "Similar designs found. Do you wish to override and proceed?",
                "matches": similar
            }
        )

    # 3. If near-duplicate and overrode, log & flag dispute signal
    if similar and payload.override_similarity_warning:
        conflict_dispute = {
            "type": "design_hash_conflict",
            "status": "pending",
            "product_id": prod_oid,
            "artisan_id": current_user["_id"],
            "registered_hash": design_hash,
            "similar_matches": similar,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "description": f"Artisan overrode similarity warnings for design hash {design_hash}. {len(similar)} similar match(es) detected."
        }
        await disputes_coll.insert_one(conflict_dispute)

    # 4. Perform the on-chain registration
    try:
        onchain_res = await register_design_onchain(
            design_hash=design_hash,
            artisan_id=artisan_id_str,
            product_id=product_id,
            image_url=product["image_url"]
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"On-chain transaction failed: {str(e)}")

    # 5. Save proof parameters to product document
    registered_at = datetime.utcnow()
    await products_coll.update_one(
        {"_id": prod_oid},
        {
            "$set": {
                "design_hash": design_hash,
                "phash": phash,
                "tx_id": onchain_res["tx_id"],
                "block_number": onchain_res["block_number"],
                "artisan_address": onchain_res["artisan_address"],
                "registered_at": registered_at
            }
        }
    )

    return {
        "message": "Design timestamp proof successfully registered on VeChain",
        "design_hash": design_hash,
        "phash": phash,
        "tx_id": onchain_res["tx_id"],
        "block_number": onchain_res["block_number"],
        "artisan_address": onchain_res["artisan_address"],
        "registered_at": registered_at
    }

@router.get("/products/{product_id}/design-proof")
async def get_design_proof(product_id: str):
    """Retrieve the stored blockchain proof details and VeChain explorer URL for verification."""
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")

    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if not product.get("design_hash"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blockchain proof not found for this product")

    tx_id = product["tx_id"]
    explorer_url = f"https://explore-testnet.vechain.org/transactions/{tx_id}"

    return {
        "design_hash": product["design_hash"],
        "phash": product["phash"],
        "tx_id": tx_id,
        "block_number": product["block_number"],
        "artisan_address": product.get("artisan_address", ""),
        "registered_at": product["registered_at"],
        "explorer_url": explorer_url
    }
