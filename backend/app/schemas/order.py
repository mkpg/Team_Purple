from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class OrderBase(BaseModel):
    client_id: str
    artisan_id: str
    product_id: Optional[str] = None
    custom_request_id: Optional[str] = None
    quotation_id: Optional[str] = None
    total_amount: float = Field(..., gt=0.0)
    advance_amount: float = Field(..., ge=0.0)
    final_amount: float = Field(..., ge=0.0)
    status: str

class OrderCreate(BaseModel):
    client_id: str
    artisan_id: str
    product_id: Optional[str] = None
    custom_request_id: Optional[str] = None
    quotation_id: Optional[str] = None
    total_amount: float
    advance_amount: float
    final_amount: float
    status: str = "Advance Payment Pending"

class OrderStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        pattern="^(Request Submitted|Quotation Sent|Quotation Accepted|Advance Payment Pending|Advance Payment Secured|Design in Progress|Production Started|Work in Progress|Quality Check|Ready for Delivery|Final Payment Pending|Delivered|Completed|Cancelled|Disputed)$"
    )

class OrderOut(OrderBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
