from sqlalchemy import Boolean, Column, String

from app.models.base import BaseModel


class Vendor(BaseModel):
    __tablename__ = "vendors"

    vendor_name = Column(String(150), nullable=True)
    company_name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="Pending")
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)