from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CommunicationCreate(BaseModel):
    vendor_id: int
    subject: str
    message: str
    communication_type: str
    status: Optional[str] = "Sent"
    communication_date: Optional[datetime] = None


class CommunicationUpdate(BaseModel):
    vendor_id: Optional[int] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    communication_type: Optional[str] = None
    status: Optional[str] = None
    communication_date: Optional[datetime] = None


class CommunicationResponse(BaseModel):
    id: int
    vendor_id: int
    subject: str
    message: str
    communication_type: str
    status: Optional[str] = "Sent"
    communication_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True