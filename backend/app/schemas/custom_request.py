from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class CustomRequestBase(BaseModel):
    artisan_id: str
    jewellery_type: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    material_preference: str = Field(..., min_length=2, max_length=100)
    stone_preference: Optional[str] = ""
    quantity: int = Field(1, ge=1)
    budget: float = Field(..., gt=0.0)
    expected_delivery_date: date
    reference_image_url: Optional[str] = ""

class CustomRequestCreate(CustomRequestBase):
    pass

class CustomRequestOut(CustomRequestBase):
    id: str
    client_id: str
    status: str  # pending, accepted, rejected
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
