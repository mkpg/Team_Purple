from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    role: str = Field(..., pattern="^(client|artisan|admin)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)

class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "60c72b2f9b1d8e256c703b41",
                "full_name": "John Doe",
                "username": "johndoe",
                "email": "john@example.com",
                "phone_number": "+1234567890",
                "role": "client",
                "is_active": True,
                "created_at": "2026-07-02T12:00:00",
                "updated_at": "2026-07-02T12:00:00"
            }
        }
