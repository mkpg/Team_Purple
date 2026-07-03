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
from app.services.reliability_score import get_reliability_badge

router = APIRouter(prefix="/api/client", tags=["Client Portal"])

@router.get("/dashboard")
async def get_client_dashboard(current_user: dict = Depends(require_client)):
    """Fetch dashboard statistics and summary metrics for the client."""
    client_oid = current_user["_id"]
    
    db = get_collection("users").database
    from app.services.reliability_score import check_delayed_orders
    await check_delayed_orders(db)
    
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
            rel_profile = user.get("reliability_profile") or {}
            rel_score = rel_profile.get("reliability_score", 100.0)
            badge = get_reliability_badge(rel_score)
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
                "reliability_badge": badge
            })
    return results

@router.get("/products")
async def get_products(current_user: dict = Depends(require_client)):
    """Fetch all active jewellery products from verified artisans."""
    products_coll = get_collection("products")
    profiles_coll = get_collection("artisan_profiles")
    
    products = await products_coll.find({"is_active": True}).to_list(length=100)
    
    results = []
    users_coll = get_collection("users")
    for prod in products:
        profile = await profiles_coll.find_one({"user_id": ObjectId(prod["artisan_id"])})
        artisan_user = await users_coll.find_one({"_id": ObjectId(prod["artisan_id"])})
        badge = "New / Building History"
        if artisan_user:
            rel_profile = artisan_user.get("reliability_profile") or {}
            rel_score = rel_profile.get("reliability_score", 100.0)
            badge = get_reliability_badge(rel_score)
        results.append({
            **serialize_doc(prod),
            "artisan_business_name": profile["business_name"] if profile else "CraftShield Artisan",
            "artisan_reliability_badge": badge
        })
    return results

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
        results.append({
            **serialize_doc(req),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan"
        })
    return results

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
        
        # Calculate delay details
        target_date = order.get("extended_completion_date") or order.get("expected_completion_date")
        is_delayed = False
        delay_days = 0
        eligible_for_refund = False
        
        if target_date:
            from datetime import date
            if isinstance(target_date, date) and not isinstance(target_date, datetime):
                target_date = datetime.combine(target_date, datetime.min.time())
            now = datetime.utcnow()
            if now > target_date:
                is_delayed = True
                delay_days = (now - target_date).days
                if delay_days >= 4 and not order.get("extension_requested"):
                    eligible_for_refund = True
                    
        results.append({
            **serialize_doc(order),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan",
            "delay_status": {
                "is_delayed": is_delayed,
                "delay_days": delay_days,
                "eligible_for_refund": eligible_for_refund
            }
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
    
    # Calculate delay details
    target_date = order.get("extended_completion_date") or order.get("expected_completion_date")
    is_delayed = False
    delay_days = 0
    eligible_for_refund = False
    
    if target_date:
        from datetime import date
        if isinstance(target_date, date) and not isinstance(target_date, datetime):
            target_date = datetime.combine(target_date, datetime.min.time())
        now = datetime.utcnow()
        if now > target_date:
            is_delayed = True
            delay_days = (now - target_date).days
            if delay_days >= 4 and not order.get("extension_requested"):
                eligible_for_refund = True
                
    # Get artisan reliability badge
    users_coll = get_collection("users")
    artisan_user = await users_coll.find_one({"_id": ObjectId(order["artisan_id"])})
    artisan_badge = "New / Building History"
    if artisan_user:
        rel_profile = artisan_user.get("reliability_profile") or {}
        rel_score = rel_profile.get("reliability_score", 100.0)
        artisan_badge = get_reliability_badge(rel_score)
        
    return {
        "order": {
            **serialize_doc(order),
            "artisan_business_name": art_profile["business_name"] if art_profile else "Unknown Artisan",
            "artisan_reliability_badge": artisan_badge,
            "delay_status": {
                "is_delayed": is_delayed,
                "delay_days": delay_days,
                "eligible_for_refund": eligible_for_refund
            }
        },
        "payments": serialize_list(payments)
    }

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

@router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(require_client)):
    """Client cancels the booking within 24 hours of creation, refunding 50% of the advance if paid."""
    return await OrderService.cancel_order_by_client(order_id, str(current_user["_id"]))

@router.put("/orders/{order_id}/cancel-delay")
async def cancel_order_due_to_artisan_delay(order_id: str, current_user: dict = Depends(require_client)):
    """Client cancels the order due to artisan's production delay, invoking full refund."""
    return await OrderService.cancel_order_by_client_artisan_delay(order_id, str(current_user["_id"]))

@router.get("/payments")
async def get_payments(current_user: dict = Depends(require_client)):
    """Fetch list of all payments made by the logged-in client."""
    payments_coll = get_collection("payments")
    payments = await payments_coll.find({"client_id": current_user["_id"]}).sort("created_at", -1).to_list(length=100)
    return serialize_list(payments)
