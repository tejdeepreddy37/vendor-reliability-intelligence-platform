from typing import Optional

from pydantic import BaseModel, EmailStr


class VendorCreate(BaseModel):
    company_name: str
    contact_person: str
    email: EmailStr
    phone: str
    address: str
    category: str


class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class VendorResponse(BaseModel):
    id: int
    company_name: str
    contact_person: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    category: str
    status: str
    is_active: bool

    class Config:
        from_attributes = True


class VendorApprovalResponse(BaseModel):
    message: str
    vendor_id: int
    status: str