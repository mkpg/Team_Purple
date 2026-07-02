from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=5, max_length=1000)
    category: str = Field(..., min_length=2, max_length=50)
    price: float = Field(..., gt=0.0)
    material: str = Field(..., min_length=2, max_length=100)
    image_url: str = Field(..., min_length=10)
    image_urls: List[str] = Field(default=[])
    estimated_delivery_days: int = Field(..., gt=0)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, min_length=5, max_length=1000)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    price: Optional[float] = Field(None, gt=0.0)
    material: Optional[str] = Field(None, min_length=2, max_length=100)
    image_url: Optional[str] = Field(None, min_length=10)
    image_urls: Optional[List[str]] = Field(None)
    estimated_delivery_days: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: str
    artisan_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
