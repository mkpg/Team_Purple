from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_artisan, require_verified_artisan
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanProfileUpdate, ArtisanProfileOut
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.schemas.quotation import QuotationCreate, QuotationOut
from app.schemas.order import OrderStatusUpdate, OrderOut
from app.services.order_service import OrderService

router = APIRouter(prefix="/api/artisan", tags=["Artisan Portal"])

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
