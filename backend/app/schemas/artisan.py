from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ArtisanProfileBase(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    jewellery_specialization: str = Field(..., min_length=2, max_length=150)
    location: str = Field(..., min_length=2, max_length=150)
    profile_description: str = Field(..., min_length=10, max_length=1000)

class ArtisanProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=2, max_length=150)
    jewellery_specialization: Optional[str] = Field(None, min_length=2, max_length=150)
    location: Optional[str] = Field(None, min_length=2, max_length=150)
    profile_description: Optional[str] = Field(None, min_length=10, max_length=1000)

class ArtisanProfileOut(ArtisanProfileBase):
    id: str
    user_id: str
    verification_status: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ArtisanVerificationUpdate(BaseModel):
    status: str = Field("verified", pattern="^(verified|rejected)$")
