from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class PaymentBase(BaseModel):
    order_id: str
    client_id: str
    artisan_id: str
    payment_type: str = Field(..., pattern="^(advance|final)$")
    amount: float = Field(..., gt=0.0)
    status: str = Field("pending", pattern="^(pending|secured|paid|failed|refunded)$")
    transaction_reference: str = Field(..., min_length=3, max_length=100)

class PaymentCreate(BaseModel):
    transaction_reference: str = Field(..., min_length=3, max_length=100)

class PaymentOut(PaymentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
