from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional

class QuotationBase(BaseModel):
    custom_request_id: str
    quoted_amount: float = Field(..., gt=0.0)
    advance_amount: float = Field(..., ge=0.0)
    expected_completion_date: date
    estimated_delivery_date: Optional[date] = None
    design_notes: str = Field(..., min_length=5, max_length=1000)

class QuotationCreate(QuotationBase):
    pass

class QuotationOut(QuotationBase):
    id: str
    artisan_id: str
    client_id: str
    status: str  # sent, accepted, rejected, expired
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
