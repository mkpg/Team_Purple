from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_access_token
from app.database import get_collection
from bson import ObjectId

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate JWT token and return the current user document."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("username")
    role = payload.get("role")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: username missing",
        )
        
    users_coll = get_collection("users")
    user = await users_coll.find_one({"username": username})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
        
    return user

async def require_client(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce that the logged-in user is a client."""
    if current_user.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Client role required.",
        )
    return current_user

async def require_artisan(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce that the logged-in user is an artisan (verified or unverified)."""
    if current_user.get("role") != "artisan":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Artisan role required.",
        )
    return current_user

async def require_verified_artisan(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce that the logged-in user is an artisan and has a verification_status of 'verified'."""
    if current_user.get("role") != "artisan":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Artisan role required.",
        )
    
    profiles_coll = get_collection("artisan_profiles")
    profile = await profiles_coll.find_one({"user_id": current_user["_id"]})
    if not profile or profile.get("verification_status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Artisan profile is not verified.",
        )
    return current_user

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Enforce that the logged-in user is an admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Admin role required.",
        )
    return current_user
