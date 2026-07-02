from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId
from app.database import get_collection
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.utils.serializers import serialize_doc
from app.schemas.auth import ClientRegister, ArtisanRegister, LoginRequest

class AuthService:
    @staticmethod
    async def check_user_exists(username: str, email: str) -> None:
        """Check if username or email already exists in the database."""
        users_coll = get_collection("users")
        existing_user = await users_coll.find_one({
            "$or": [
                {"username": username.lower()},
                {"email": email.lower()}
            ]
        })
        if existing_user:
            if existing_user["username"] == username.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username is already taken"
                )
            if existing_user["email"] == email.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already registered"
                )

    @classmethod
    async def register_client(cls, client_data: ClientRegister) -> dict:
        """Register a new client."""
        await cls.check_user_exists(client_data.username, client_data.email)
        
        users_coll = get_collection("users")
        new_client = {
            "full_name": client_data.full_name,
            "username": client_data.username.lower(),
            "email": client_data.email.lower(),
            "phone_number": client_data.phone_number,
            "password_hash": get_password_hash(client_data.password),
            "role": "client",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        res = await users_coll.insert_one(new_client)
        new_client["_id"] = res.inserted_id
        return serialize_doc(new_client)

    @classmethod
    async def register_artisan(cls, artisan_data: ArtisanRegister) -> dict:
        """Register a new artisan and create a pending profile."""
        await cls.check_user_exists(artisan_data.username, artisan_data.email)
        
        users_coll = get_collection("users")
        new_artisan = {
            "full_name": artisan_data.full_name,
            "username": artisan_data.username.lower(),
            "email": artisan_data.email.lower(),
            "phone_number": artisan_data.phone_number,
            "password_hash": get_password_hash(artisan_data.password),
            "role": "artisan",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        res = await users_coll.insert_one(new_artisan)
        user_id = res.inserted_id
        new_artisan["_id"] = user_id
        
        # Create profile
        profiles_coll = get_collection("artisan_profiles")
        profile = {
            "user_id": user_id,
            "business_name": artisan_data.business_name,
            "jewellery_specialization": artisan_data.jewellery_specialization,
            "location": artisan_data.location,
            "profile_description": artisan_data.profile_description,
            "verification_status": "pending",
            "verified_by": None,
            "verified_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await profiles_coll.insert_one(profile)
        
        return serialize_doc(new_artisan)

    @staticmethod
    async def login_user(login_data: LoginRequest) -> dict:
        """Log in a user and return details including verification status and JWT access token."""
        users_coll = get_collection("users")
        username_or_email = login_data.username_or_email.lower()
        
        # Search by username or email
        user = await users_coll.find_one({
            "$or": [
                {"username": username_or_email},
                {"email": username_or_email}
            ]
        })
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password"
            )
            
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username/email or password"
            )
            
        if user["role"] != login_data.role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"User is not registered with the role: {login_data.role}"
            )
            
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated"
            )
            
        # Get artisan verification status if applicable
        verification_status = None
        if user["role"] == "artisan":
            profiles_coll = get_collection("artisan_profiles")
            profile = await profiles_coll.find_one({"user_id": user["_id"]})
            if profile:
                verification_status = profile.get("verification_status", "pending")
            else:
                verification_status = "pending"
                
        # Generate token
        token_data = {
            "sub": str(user["_id"]),
            "username": user["username"],
            "role": user["role"]
        }
        access_token = create_access_token(data=token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user["_id"]),
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "verification_status": verification_status
        }
