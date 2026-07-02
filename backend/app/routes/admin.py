from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_admin
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanVerificationUpdate

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

@router.get("/dashboard")
async def get_admin_dashboard(current_user: dict = Depends(require_admin)):
    """Fetch global dashboard statistics for the system administrator."""
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
    
    return {
        "stats": {
            "total_clients": total_clients,
            "total_artisans": total_artisans,
            "pending_verifications": pending_verifications,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_disputes": total_disputes
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
