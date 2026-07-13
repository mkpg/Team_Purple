from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class ClientRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=4)
    role: str = Field("client", pattern="^client$")

class ArtisanRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=4)
    role: str = Field("artisan", pattern="^artisan$")
    jewellery_specialization: str = Field(..., min_length=2, max_length=150)
    business_name: str = Field(..., min_length=2, max_length=150)
    location: str = Field(..., min_length=2, max_length=150)
    profile_description: str = Field(..., min_length=10, max_length=1000)
    kyc_completed: Optional[bool] = False

class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    role: str = Field(..., pattern="^(client|artisan|admin)$")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    full_name: str
    role: str
    verification_status: Optional[str] = None  # None for client/admin, pending/verified/rejected for artisan
