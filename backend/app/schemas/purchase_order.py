from datetime import date
from typing import Optional

from pydantic import BaseModel


class PurchaseOrderCreate(BaseModel):
    po_number: str
    procurement_id: int
    vendor_id: int
    order_date: date
    expected_delivery: Optional[date] = None
    total_amount: float
    remarks: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    po_number: Optional[str] = None
    procurement_id: Optional[int] = None
    vendor_id: Optional[int] = None
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    remarks: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    procurement_id: int
    vendor_id: int
    order_date: date
    expected_delivery: Optional[date] = None
    total_amount: float
    status: str
    payment_status: str
    remarks: Optional[str] = None

    class Config:
        from_attributes = True