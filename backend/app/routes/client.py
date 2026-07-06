from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_client
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.custom_request import CustomRequestCreate, CustomRequestOut
from app.schemas.quotation import QuotationOut
from app.schemas.order import OrderOut
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.trust_score import get_trust_badge
from app.services.reliability_score import get_reliability_badge, calculate_delay_discount, apply_reliability_event
from app.services.transaction_proof import get_order_proof_response
from app.schemas.order import DelayResolutionChoice

router = APIRouter(prefix="/api/client", tags=["Client Portal"])

@router.get("/dashboard")
async def get_client_dashboard(current_user: dict = Depends(require_client)):
    """Fetch dashboard statistics and summary metrics for the client."""
    client_oid = current_user["_id"]
    
    requests_coll = get_collection("custom_requests")
    orders_coll = get_collection("orders")
    payments_coll = get_collection("payments")
    
    # Run queries in parallel/sequence
    total_requests = await requests_coll.count_documents({"client_id": client_oid})
    pending_requests = await requests_coll.count_documents({"client_id": client_oid, "status": "pending"})
    
    total_orders = await orders_coll.count_documents({"client_id": client_oid})
    active_orders = await orders_coll.count_documents({
        "client_id": client_oid, 
        "status": {"$nin": ["Delivered", "Completed", "Cancelled"]}
    })
    
    # Calculate total money spent
    pipeline = [
        {"$match": {"client_id": client_oid, "status": {"$in": ["secured", "paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    cursor = payments_coll.aggregate(pipeline)
    total_spent = 0.0
    async for result in cursor:
        total_spent = result.get("total", 0.0)
        
    # Get recent orders
    recent_orders_cursor = orders_coll.find({"client_id": client_oid}).sort("updated_at", -1).limit(5)
    recent_orders = await recent_orders_cursor.to_list(length=5)
    
    return {
        "stats": {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "total_orders": total_orders,
            "active_orders": active_orders,
            "total_spent": total_spent
        },
        "recent_orders": serialize_list(recent_orders)
    }

@router.get("/artisans")
async def get_artisans(current_user: dict = Depends(require_client)):
    """Fetch all verified artisans and their business profiles."""
    profiles_coll = get_collection("artisan_profiles")
    users_coll = get_collection("users")
    
    verified_profiles = await profiles_coll.find({"verification_status": "verified"}).to_list(length=100)
    
    results = []
    for profile in verified_profiles:
        user = await users_coll.find_one({"_id": profile["user_id"]})
        if user:
            results.append({
                "artisan_id": str(user["_id"]),
                "full_name": user["full_name"],
                "username": user["username"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "business_name": profile["business_name"],
                "jewellery_specialization": profile["jewellery_specialization"],
                "location": profile["location"],
                "profile_description": profile["profile_description"],
                "verified_at": profile.get("verified_at"),
                "trust_badge": get_trust_badge(float((user.get("trust_profile") or {}).get("trust_score", 100.0))),
                "reliability_badge": get_reliability_badge(float((user.get("reliability_profile") or {}).get("reliability_score", 100.0)))
            })
    return results

@router.get("/products")
async def get_products(current_user: dict = Depends(require_client)):
    """Fetch all active jewellery products from verified artisans."""
    products_coll = get_collection("products")
    profiles_coll = get_collection("artisan_profiles")
    users_coll = get_collection("users")
    
    products = await products_coll.find({"is_active": True}).to_list(length=100)
    
    results = []
    for prod in products:
        profile = await profiles_coll.find_one({"user_id": ObjectId(prod["artisan_id"])})
        user = await users_coll.find_one({"_id": ObjectId(prod["artisan_id"])} )
        results.append({
            **serialize_doc(prod),
            "artisan_business_name": profile["business_name"] if profile else "CraftShield Artisan",
            "artisan_reliability_badge": get_reliability_badge(float((user.get("reliability_profile") or {}).get("reliability_score", 100.0))) if user else "Reliable"
        })
    return results

def _build_delay_context(order: dict) -> dict:
    deadline = order.get("extended_completion_date") or order.get("expected_completion_date")
    if not deadline:
        return {"delay_status": None, "delay_discount_percent": None, "delay_resolution": None}
    if isinstance(deadline, str):
        try:
            deadline = datetime.fromisoformat(deadline)
        except Exception:
            return {"delay_status": None, "delay_discount_percent": None, "delay_resolution": None}
    now = datetime.utcnow()
    if now <= deadline:
        return {"delay_status": None, "delay_discount_percent": None, "delay_resolution": None}
    days_late = (now - deadline).days
    extension_broken = bool(order.get("extended_completion_date") and order.get("extended_completion_date") == deadline)
    discount = calculate_delay_discount(days_late, extension_broken)
    if days_late < 4:
        return {"delay_status": "grace_window", "delay_discount_percent": 0.0, "delay_resolution": None}
    return {
        "delay_status": "late",
        "delay_discount_percent": discount,
        "delay_resolution": order.get("delay_resolution")
    }

@router.post("/custom-requests", status_code=status.HTTP_201_CREATED)
async def create_custom_request(payload: CustomRequestCreate, current_user: dict = Depends(require_client)):
    """Submit a custom jewellery design request to a verified artisan."""
    users_coll = get_collection("users")
    profiles_coll = get_collection("artisan_profiles")
    requests_coll = get_collection("custom_requests")
    
    try:
        art_oid = ObjectId(payload.artisan_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid artisan ID format")
        
    # Check if artisan exists and is verified
    artisan_user = await users_coll.find_one({"_id": art_oid, "role": "artisan"})
    if not artisan_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artisan not found")
        
    profile = await profiles_coll.find_one({"user_id": art_oid})
    if not profile or profile.get("verification_status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="You can only submit requests to verified artisans"
        )
        
    new_request = {
        "client_id": current_user["_id"],
        "artisan_id": art_oid,
        "jewellery_type": payload.jewellery_type,
        "description": payload.description,
        "material_preference": payload.material_preference,
        "stone_preference": payload.stone_preference,
        "quantity": payload.quantity,
        "budget": payload.budget,
        "expected_delivery_date": datetime.combine(payload.expected_delivery_date, datetime.min.time()),
        "reference_image_url": payload.reference_image_url,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    res = await requests_coll.insert_one(new_request)
    new_request["_id"] = res.inserted_id
    
    return serialize_doc(new_request)

@router.get("/custom-requests")
async def get_custom_requests(current_user: dict = Depends(require_client)):
    """Fetch all custom requests submitted by the logged-in client."""
    requests_coll = get_collection("custom_requests")
    profiles_coll = get_collection("artisan_profiles")
    
    requests = await requests_coll.find({"client_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    
    results = []
    for req in requests:
        art_profile = await profiles_coll.find_one({"user_id": req["artisan_id"]})
        client_user = await get_collection("users").find_one({"_id": req["client_id"]})
        results.append({
            **serialize_doc(req),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan",
            "client_trust_badge": get_trust_badge(float((client_user.get("trust_profile") or {}).get("trust_score", 100.0))) if client_user else get_trust_badge(100.0)
        })
    return results

@router.get("/trust-score")
async def get_trust_score(current_user: dict = Depends(require_client)):
    """Return the client's trust profile and a friendly recovery hint."""
    profile = current_user.get("trust_profile") or {
        "trust_score": 100.0,
        "score_history": [],
        "consecutive_good_orders": 0,
    }
    score = float(profile.get("trust_score", 100.0))
    badge = get_trust_badge(score)
    remaining = max(0, 3 - int(profile.get("consecutive_good_orders", 0)))
    if remaining == 0:
        hint = "You are on a good streak. Keep going to stay in strong standing."
    elif remaining == 1:
        hint = "Complete 1 more on-time order to boost your standing."
    else:
        hint = f"Complete {remaining} more on-time orders to boost your standing."
    return {
        "trust_profile": profile,
        "trust_badge": badge,
        "path_to_improvement": hint,
    }

@router.delete("/custom-requests/{request_id}")
async def cancel_custom_request(request_id: str, current_user: dict = Depends(require_client)):
    """Cancel/withdraw a pending custom design request."""
    requests_coll = get_collection("custom_requests")
    
    try:
        req_oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")
        
    req = await requests_coll.find_one({"_id": req_oid})
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
    if str(req["client_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this request")
        
    if req["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only pending requests can be cancelled"
        )
        
    await requests_coll.delete_one({"_id": req_oid})
    return {"message": "Custom request withdrawn successfully"}

@router.get("/quotations")
async def get_quotations(current_user: dict = Depends(require_client)):
    """Fetch all design/price quotations received by the logged-in client."""
    quotations_coll = get_collection("quotations")
    profiles_coll = get_collection("artisan_profiles")
    
    quots = await quotations_coll.find({"client_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    
    results = []
    for q in quots:
        art_profile = await profiles_coll.find_one({"user_id": q["artisan_id"]})
        results.append({
            **serialize_doc(q),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan"
        })
    return results

@router.put("/quotations/{quotation_id}/accept")
async def accept_quotation(quotation_id: str, current_user: dict = Depends(require_client)):
    """Accept a quotation. This changes status to 'accepted' and creates a new Order."""
    return await OrderService.create_order_from_quotation(quotation_id, str(current_user["_id"]))

@router.put("/quotations/{quotation_id}/reject")
async def reject_quotation(quotation_id: str, current_user: dict = Depends(require_client)):
    """Reject a quotation."""
    quotations_coll = get_collection("quotations")
    
    try:
        quot_oid = ObjectId(quotation_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quotation ID format")
        
    quotation = await quotations_coll.find_one({"_id": quot_oid})
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
        
    if str(quotation["client_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this quotation")
        
    if quotation["status"] != "sent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only 'sent' quotations can be rejected")
        
    await quotations_coll.update_one(
        {"_id": quot_oid},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Quotation rejected successfully"}

@router.get("/orders")
async def get_orders(current_user: dict = Depends(require_client)):
    """Fetch all orders for the client."""
    orders_coll = get_collection("orders")
    profiles_coll = get_collection("artisan_profiles")
    
    orders = await orders_coll.find({"client_id": current_user["_id"]}).sort("updated_at", -1).to_list(length=100)
    
    results = []
    for order in orders:
        art_profile = await profiles_coll.find_one({"user_id": order["artisan_id"]})
        delay_ctx = _build_delay_context(order)
        results.append({
            **serialize_doc(order),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan",
            **delay_ctx
        })
    return results

@router.get("/orders/{order_id}")
async def get_order_details(order_id: str, current_user: dict = Depends(require_client)):
    """Fetch detailed information for a specific order."""
    orders_coll = get_collection("orders")
    profiles_coll = get_collection("artisan_profiles")
    payments_coll = get_collection("payments")
    
    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
        
    order = await orders_coll.find_one({"_id": order_oid})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if str(order["client_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this order")
        
    art_profile = await profiles_coll.find_one({"user_id": order["artisan_id"]})
    payments = await payments_coll.find({"order_id": order_oid}).to_list(length=10)
    delay_ctx = _build_delay_context(order)
    
    return {
        "order": {
            **serialize_doc(order),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan",
            **delay_ctx
        },
        "payments": serialize_list(payments)
    }

@router.post("/orders/{order_id}/resolve-delay")
async def resolve_delay(order_id: str, payload: DelayResolutionChoice, current_user: dict = Depends(require_client)):
    orders_coll = get_collection("orders")
    payments_coll = get_collection("payments")
    users_coll = get_collection("users")
    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
    order = await orders_coll.find_one({"_id": order_oid})
    if not order or str(order["client_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    delay_ctx = _build_delay_context(order)
    if not delay_ctx.get("delay_status"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This order is not currently late")
    artisan_id = order["artisan_id"]
    if payload.choice == "stay_with_discount":
        discount = float(delay_ctx.get("delay_discount_percent") or 0.0)
        await orders_coll.update_one({"_id": order_oid}, {"$set": {"delay_resolution": "discount_applied", "delay_discount_percent": discount, "updated_at": datetime.utcnow()}})
        await payments_coll.insert_one({
            "order_id": order_oid,
            "client_id": current_user["_id"],
            "artisan_id": artisan_id,
            "payment_type": "discount_applied",
            "amount": discount,
            "status": "applied",
            "transaction_reference": f"DISC-{order_id[:8].upper()}-{int(datetime.utcnow().timestamp())}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        await apply_reliability_event(db=get_collection("orders").database, artisan_id=artisan_id, event_type="SIGNIFICANT_DELAY" if (delay_ctx.get("delay_status") == "late") else "GRACE_WINDOW_DELAY", order_id=order_oid, note=f"Client chose discount resolution for delayed order. Discount: {discount}%")
        return {"message": "Discount applied and order continues", "discount_percent": discount}
    if payload.choice == "cancel_full_refund":
        advance_amount = float(order.get("advance_amount", 0.0))
        refund_doc = {
            "order_id": order_oid,
            "client_id": current_user["_id"],
            "artisan_id": artisan_id,
            "payment_type": "refund",
            "amount": advance_amount,
            "status": "repaid",
            "transaction_reference": f"REFUND-{order_id[:8].upper()}-{int(datetime.utcnow().timestamp())}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await payments_coll.insert_one(refund_doc)
        await orders_coll.update_one({"_id": order_oid}, {"$set": {"status": "Cancelled Artisan Delay", "delay_resolution": "cancelled_artisan_delay", "refunded_amount": advance_amount, "updated_at": datetime.utcnow()}})
        await apply_reliability_event(db=get_collection("orders").database, artisan_id=artisan_id, event_type="SEVERE_DELAY" if (delay_ctx.get("delay_discount_percent") or 0) >= 15 else "SIGNIFICANT_DELAY", order_id=order_oid, note="Client cancelled due to artisan delay and received full refund.")
        return {"message": "Full refund issued and order cancelled due to delay"}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid delay resolution choice")

@router.post("/orders/{order_id}/payments/advance")
async def pay_advance_payment(order_id: str, payload: PaymentCreate, current_user: dict = Depends(require_client)):
    """Submit a mock advance payment, upgrading the order status to 'Advance Payment Secured'."""
    return await PaymentService.create_advance_payment(order_id, str(current_user["_id"]), payload.transaction_reference)

@router.post("/orders/{order_id}/payments/final")
async def pay_final_payment(order_id: str, payload: PaymentCreate, current_user: dict = Depends(require_client)):
    """Submit a mock final payment, upgrading the order status to 'Final Payment Pending'."""
    return await PaymentService.create_final_payment(order_id, str(current_user["_id"]), payload.transaction_reference)

@router.put("/orders/{order_id}/complete")
async def complete_order(order_id: str, current_user: dict = Depends(require_client)):
    """Client confirms that the order has been delivered and marks it as Completed."""
    return await OrderService.update_order_status(order_id, "Completed", current_user)

@router.get("/orders/{order_id}/proof")
async def get_order_transaction_proof(order_id: str, current_user: dict = Depends(require_client)):
    """Return the client's verified transaction receipt and QR code."""
    db = get_collection("orders").database
    return await get_order_proof_response(db, order_id, owner_filter={"client_id": current_user["_id"]})

@router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(require_client)):
    """Client cancels the booking within 24 hours of creation, refunding 50% of the advance if paid."""
    return await OrderService.cancel_order_by_client(order_id, str(current_user["_id"]))

@router.get("/payments")
async def get_payments(current_user: dict = Depends(require_client)):
    """Fetch list of all payments made by the logged-in client."""
    payments_coll = get_collection("payments")
    payments = await payments_coll.find({"client_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    return serialize_list(payments)
