from datetime import date
from typing import Optional

from pydantic import BaseModel


class ContractCreate(BaseModel):
    contract_number: str
    vendor_id: int
    contract_name: str
    start_date: date
    end_date: date
    contract_value: float
    currency: Optional[str] = "INR"
    description: Optional[str] = None


class ContractUpdate(BaseModel):
    contract_name: Optional[str] = None
    end_date: Optional[date] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ContractResponse(BaseModel):
    id: int
    vendor_id: int
    contract_number: str
    start_date: date
    end_date: date
    status: Optional[str] = "Active"
    contract_name: Optional[str] = ""
    contract_value: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    description: Optional[str] = None
    terms_conditions: Optional[str] = None

    class Config:
        from_attributes = True
