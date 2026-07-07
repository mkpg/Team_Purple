from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List

from app.dependencies import require_admin
from app.database import get_collection
from app.utils.serializers import serialize_doc, serialize_list
from app.schemas.artisan import ArtisanVerificationUpdate
from app.schemas.order import ScoreAdjustmentRequest
from app.services.trust_score import get_trust_badge, get_trust_path_hint
from app.services.reliability_score import get_reliability_badge, get_reliability_path_hint
from app.services.transaction_proof import lookup_proof

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
    orders_coll = get_collection("orders")
    
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
    delayed_orders = await orders_coll.count_documents({
        "status": {"$nin": ["Completed", "Cancelled", "Cancelled Artisan Delay"]},
        "$or": [
            {"delay_status": "late"},
            {"delay_status": "grace_window"}
        ]
    })
    
    return {
        "stats": {
            "total_clients": total_clients,
            "total_artisans": total_artisans,
            "pending_verifications": pending_verifications,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_disputes": total_disputes,
            "delayed_orders": delayed_orders
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
        if u.get("role") == "client":
            score = float((u.get("trust_profile") or {}).get("trust_score", 100.0))
            u["trust_badge"] = get_trust_badge(score)
            u["trust_path_to_improvement"] = get_trust_path_hint(u.get("trust_profile"))
        if u.get("role") == "artisan":
            score = float((u.get("reliability_profile") or {}).get("reliability_score", 100.0))
            u["reliability_badge"] = get_reliability_badge(score)
            u["reliability_path_to_improvement"] = get_reliability_path_hint(u.get("reliability_profile"))
    return serialized_users

@router.get("/users/{user_id}/score-history")
async def get_user_score_history(user_id: str, current_user: dict = Depends(require_admin)):
    users_coll = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
    user = await users_coll.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.get("role") == "client":
        profile = user.get("trust_profile") or {}
        return {"profile_type": "trust", "score": profile.get("trust_score", 100.0), "badge": get_trust_badge(float(profile.get("trust_score", 100.0))), "path_to_improvement": get_trust_path_hint(profile), "score_history": profile.get("score_history", [])}
    if user.get("role") == "artisan":
        profile = user.get("reliability_profile") or {}
        return {"profile_type": "reliability", "score": profile.get("reliability_score", 100.0), "badge": get_reliability_badge(float(profile.get("reliability_score", 100.0))), "path_to_improvement": get_reliability_path_hint(profile), "score_history": profile.get("score_history", [])}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score history only applies to client and artisan users")

@router.put("/users/{user_id}/score-adjust")
async def adjust_user_score(user_id: str, payload: ScoreAdjustmentRequest, current_user: dict = Depends(require_admin)):
    users_coll = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
    user = await users_coll.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    now = datetime.utcnow()
    if user.get("role") == "client" and payload.profile_type == "trust":
        profile = user.get("trust_profile") or {}
        history = profile.get("score_history") or []
        score = max(0.0, min(100.0, float(profile.get("trust_score", 100.0)) + payload.delta))
        history.append({"event_type": "ADMIN_ADJUSTMENT", "delta": payload.delta, "order_id": None, "note": payload.note, "created_at": now, "weight_multiplier": 1.0})
        await users_coll.update_one({"_id": oid}, {"$set": {"trust_profile": {"trust_score": score, "score_history": history, "consecutive_good_orders": int(profile.get("consecutive_good_orders", 0))}, "updated_at": now}})
        return {"message": "Client trust score adjusted", "badge": get_trust_badge(score)}
    if user.get("role") == "artisan" and payload.profile_type == "reliability":
        profile = user.get("reliability_profile") or {}
        history = profile.get("score_history") or []
        score = max(0.0, min(100.0, float(profile.get("reliability_score", 100.0)) + payload.delta))
        history.append({"event_type": "ADMIN_ADJUSTMENT", "delta": payload.delta, "order_id": None, "note": payload.note, "created_at": now, "weight_multiplier": 1.0})
        await users_coll.update_one({"_id": oid}, {"$set": {"reliability_profile": {"reliability_score": score, "score_history": history, "consecutive_ontime_orders": int(profile.get("consecutive_ontime_orders", 0))}, "updated_at": now}})
        return {"message": "Artisan reliability score adjusted", "badge": get_reliability_badge(score)}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile type does not match user role")

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

@router.get("/proofs/{lookup_value}")
async def lookup_transaction_proof(lookup_value: str, current_user: dict = Depends(require_admin)):
    """Look up a verified transaction receipt by proof ID or order ID."""
    db = get_collection("orders").database
    return await lookup_proof(db, lookup_value)

@router.get("/disputes")
async def get_all_disputes(current_user: dict = Depends(require_admin)):
    """List all active disputes."""
    disputes_coll = get_collection("disputes")
    disputes = await disputes_coll.find({}).sort("created_at", -1).to_list(length=200)
    return serialize_list(disputes)

@router.delete("/products/{product_id}")
async def delete_product_by_admin(product_id: str, current_user: dict = Depends(require_admin)):
    """Delete any product from the catalog (Admin only)."""
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")
    
    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    await products_coll.delete_one({"_id": prod_oid})
    return {"message": "Product deleted by admin successfully"}
