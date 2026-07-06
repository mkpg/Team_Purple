from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TransactionProof(BaseModel):
    proof_id: str
    order_id: str
    client_id: str
    artisan_id: str
    jewel_type: str
    amount: float
    currency: str = "INR"
    completed_at: datetime | str
    signature: str
    created_at: datetime


class VerificationSummary(BaseModel):
    valid: bool
    payload: Optional[dict] = None
