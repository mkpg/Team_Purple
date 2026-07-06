from fastapi import APIRouter, Depends, status
from app.schemas.auth import ClientRegister, ArtisanRegister, LoginRequest, TokenResponse
from app.services.auth_service import AuthService
from app.dependencies import get_current_user
from app.database import get_collection
from app.utils.serializers import serialize_doc
from app.services.trust_score import get_trust_badge, get_trust_path_hint
from app.services.reliability_score import get_reliability_badge, get_reliability_path_hint

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register/client", status_code=status.HTTP_201_CREATED)
async def register_client(client_data: ClientRegister):
    """Public registration for clients. Clients become active immediately."""
    user = await AuthService.register_client(client_data)
    user.pop("password_hash", None)
    return user

@router.post("/register/artisan", status_code=status.HTTP_201_CREATED)
async def register_artisan(artisan_data: ArtisanRegister):
    """Public registration for artisans. Artisans are created with verification_status 'pending'."""
    user = await AuthService.register_artisan(artisan_data)
    user.pop("password_hash", None)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """Verify credentials and return access token with user metadata."""
    return await AuthService.login_user(login_data)

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Fetch profile data of the currently logged-in user."""
    user_data = serialize_doc(current_user)
    user_data.pop("password_hash", None)

    if current_user.get("role") == "client":
        trust_profile = current_user.get("trust_profile") or {}
        score = float(trust_profile.get("trust_score", 100.0))
        user_data["trust_badge"] = get_trust_badge(score)
        user_data["trust_path_to_improvement"] = get_trust_path_hint(trust_profile)
    
    if current_user.get("role") == "artisan":
        profiles_coll = get_collection("artisan_profiles")
        profile = await profiles_coll.find_one({"user_id": current_user["_id"]})
        if profile:
            user_data["artisan_profile"] = serialize_doc(profile)
            user_data["verification_status"] = profile.get("verification_status", "pending")
        else:
            user_data["verification_status"] = "pending"
        reliability_profile = current_user.get("reliability_profile") or {}
        score = float(reliability_profile.get("reliability_score", 100.0))
        user_data["reliability_badge"] = get_reliability_badge(score)
        user_data["reliability_path_to_improvement"] = get_reliability_path_hint(reliability_profile)
            
    return user_data
