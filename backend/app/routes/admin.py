from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_admin
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanVerificationUpdate
from app.schemas.product import ProductUpdate
from app.services.reliability_score import get_reliability_badge
from pydantic import BaseModel, Field

class ScoreAdjustment(BaseModel):
    adjustment: float = Field(..., description="Change to apply to the reliability score.")
    reason: str = Field(..., min_length=5, max_length=500)

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

@router.get("/dashboard")
async def get_admin_dashboard(current_user: dict = Depends(require_admin)):
    """Fetch global dashboard statistics for the system administrator."""
    db = get_collection("users").database
    from app.services.reliability_score import check_delayed_orders
    await check_delayed_orders(db)
    
    users_coll = get_collection("users")
    profiles_coll = get_collection("artisan_profiles")
    products_coll = get_collection("products")
    orders_coll = get_collection("orders")
    payments_coll = get_collection("payments")
    disputes_coll = get_collection("disputes")
    
    # User counts by role
    total_clients = await users_coll.count_documents({"role": "client"})
    total_artisans = await users_coll.count_documents({"role": "artisan"})
    pending_verifications = await profiles_coll.count_documents({"verification_status": "pending"})
    
    # Product and Order counts
    total_products = await products_coll.count_documents({})
    total_orders = await orders_coll.count_documents({})
    
    # Sum total system-wide transaction volume (mock payments secured/paid)
    pipeline = [
        {"$match": {"status": {"$in": ["secured", "paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    cursor = payments_coll.aggregate(pipeline)
    total_revenue = 0.0
    async for result in cursor:
        total_revenue = result.get("total", 0.0)
        
    total_disputes = await disputes_coll.count_documents({})
    
    # Calculate aggregate delay statistics
    now = datetime.utcnow()
    active_statuses = [
        "Advance Payment Pending", "Advance Payment Secured",
        "Design in Progress", "Production Started", "Work in Progress",
        "Quality Check", "Ready for Delivery", "Final Payment Pending"
    ]
    delayed_orders = await orders_coll.count_documents({
        "status": {"$in": active_statuses},
        "$or": [
            {"extended_completion_date": {"$lt": now}},
            {"extended_completion_date": None, "expected_completion_date": {"$lt": now}}
        ]
    })
    
    # Calculate average reliability score
    pipeline_avg = [
        {"$match": {"role": "artisan", "reliability_profile.reliability_score": {"$ne": None}}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$reliability_profile.reliability_score"}}}
    ]
    cursor_avg = users_coll.aggregate(pipeline_avg)
    avg_score = 100.0
    async for result in cursor_avg:
        avg_score = result.get("avg_score", 100.0)
        
    return {
        "stats": {
            "total_clients": total_clients,
            "total_artisans": total_artisans,
            "pending_verifications": pending_verifications,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_disputes": total_disputes,
            "delayed_orders": delayed_orders,
            "avg_artisan_reliability_score": avg_score
        }
    }

@router.get("/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    """List all registered users in the database (excluding password hashes)."""
    users_coll = get_collection("users")
    users = await users_coll.find({}).to_list(length=200)
    
    serialized_users = serialize_list(users)
    for u in serialized_users:
        u.pop("password_hash", None)
    return serialized_users

@router.get("/artisans/pending")
async def get_pending_artisans(current_user: dict = Depends(require_admin)):
    """List all artisans awaiting verification."""
    profiles_coll = get_collection("artisan_profiles")
    users_coll = get_collection("users")
    
    pending_profiles = await profiles_coll.find({"verification_status": "pending"}).to_list(length=100)
    
    results = []
    for prof in pending_profiles:
        user = await users_coll.find_one({"_id": prof["user_id"]})
        if user:
            results.append({
                "artisan_id": str(user["_id"]),
                "full_name": user["full_name"],
                "username": user["username"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "business_name": prof["business_name"],
                "jewellery_specialization": prof["jewellery_specialization"],
                "location": prof["location"],
                "profile_description": prof["profile_description"],
                "verification_status": prof["verification_status"],
                "created_at": prof["created_at"]
            })
    return results

@router.put("/artisans/{artisan_id}/verify")
async def verify_artisan(artisan_id: str, payload: ArtisanVerificationUpdate, current_user: dict = Depends(require_admin)):
    """Approve or reject a pending artisan profile."""
    profiles_coll = get_collection("artisan_profiles")
    
    try:
        art_oid = ObjectId(artisan_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid artisan user ID format")
        
    profile = await profiles_coll.find_one({"user_id": art_oid})
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artisan profile not found")
        
    await profiles_coll.update_one(
        {"user_id": art_oid},
        {
            "$set": {
                "verification_status": payload.status,
                "verified_by": "admin",
                "verified_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated_profile = await profiles_coll.find_one({"user_id": art_oid})
    return serialize_doc(updated_profile)

@router.get("/products")
async def get_all_products(current_user: dict = Depends(require_admin)):
    """List all jewellery products from all artisans."""
    products_coll = get_collection("products")
    products = await products_coll.find({}).to_list(length=200)
    return serialize_list(products)

@router.get("/orders")
async def get_all_orders(current_user: dict = Depends(require_admin)):
    """List all orders in the system."""
    orders_coll = get_collection("orders")
    orders = await orders_coll.find({}).sort("created_at", -1).to_list(length=200)
    return serialize_list(orders)

@router.get("/payments")
async def get_all_payments(current_user: dict = Depends(require_admin)):
    """List all payments in the system."""
    payments_coll = get_collection("payments")
    payments = await payments_coll.find({}).sort("created_at", -1).to_list(length=200)
    return serialize_list(payments)

@router.get("/disputes")
async def get_all_disputes(current_user: dict = Depends(require_admin)):
    """List all active disputes."""
    disputes_coll = get_collection("disputes")
    disputes = await disputes_coll.find({}).sort("created_at", -1).to_list(length=200)
    return serialize_list(disputes)

@router.delete("/products/{product_id}", status_code=status.HTTP_200_OK)
async def admin_delete_product(product_id: str, current_user: dict = Depends(require_admin)):
    """Allow an admin to delete any product from the catalog."""
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")
    
    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    await products_coll.delete_one({"_id": prod_oid})
    return {"status": "success", "message": "Product deleted successfully"}

@router.put("/products/{product_id}", status_code=status.HTTP_200_OK)
async def admin_update_product(product_id: str, payload: ProductUpdate, current_user: dict = Depends(require_admin)):
    """Allow an admin to edit any product's details and manage images."""
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")
    
    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
    update_data["updated_at"] = datetime.utcnow()
    await products_coll.update_one({"_id": prod_oid}, {"$set": update_data})
    
    updated_product = await products_coll.find_one({"_id": prod_oid})
    return serialize_doc(updated_product)

@router.get("/artisans/{artisan_id}/reliability")
async def get_artisan_reliability_history(artisan_id: str, current_user: dict = Depends(require_admin)):
    """Retrieve full reliability profile, badge, and history log for an artisan."""
    users_coll = get_collection("users")
    try:
        art_oid = ObjectId(artisan_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid artisan ID format")
        
    artisan = await users_coll.find_one({"_id": art_oid, "role": "artisan"})
    if not artisan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artisan not found")
        
    rel_profile = artisan.get("reliability_profile") or {
        "reliability_score": 100.0,
        "score_history": [],
        "consecutive_ontime_orders": 0
    }
    
    return {
        "artisan_id": artisan_id,
        "full_name": artisan["full_name"],
        "reliability_score": rel_profile.get("reliability_score", 100.0),
        "reliability_badge": get_reliability_badge(rel_profile.get("reliability_score", 100.0)),
        "consecutive_ontime_orders": rel_profile.get("consecutive_ontime_orders", 0),
        "score_history": serialize_list(rel_profile.get("score_history", []))
    }

@router.put("/artisans/{artisan_id}/reliability")
async def adjust_artisan_reliability(artisan_id: str, payload: ScoreAdjustment, current_user: dict = Depends(require_admin)):
    """Manually adjust an artisan's reliability score with a reason log (for dispute resolution)."""
    users_coll = get_collection("users")
    try:
        art_oid = ObjectId(artisan_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid artisan ID format")
        
    artisan = await users_coll.find_one({"_id": art_oid, "role": "artisan"})
    if not artisan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artisan not found")
        
    rel_profile = artisan.get("reliability_profile") or {
        "reliability_score": 100.0,
        "score_history": [],
        "consecutive_ontime_orders": 0
    }
    
    current_score = float(rel_profile.get("reliability_score", 100.0))
    new_score = max(0.0, min(100.0, current_score + payload.adjustment))
    
    history = rel_profile.get("score_history") or []
    history_entry = {
        "event_type": "ADMIN_MANUAL_ADJUSTMENT",
        "delta": payload.adjustment,
        "order_id": None,
        "note": f"Admin adjustment: {payload.reason}",
        "created_at": datetime.utcnow(),
        "weight_multiplier": 1.0
    }
    history.append(history_entry)
    
    await users_coll.update_one(
        {"_id": art_oid},
        {
            "$set": {
                "reliability_profile": {
                    "reliability_score": new_score,
                    "score_history": history,
                    "consecutive_ontime_orders": rel_profile.get("consecutive_ontime_orders", 0)
                }
            }
        }
    )
    
    return {
        "message": "Artisan reliability score adjusted successfully",
        "new_score": new_score,
        "badge": get_reliability_badge(new_score)
    }

