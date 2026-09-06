from sqlalchemy import Column, String, Date, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Contract(BaseModel):
    __tablename__ = "contracts"

    contract_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False
    )

    contract_title = Column(
        String(255),
        nullable=True
    )

    start_date = Column(
        Date,
        nullable=False
    )

    end_date = Column(
        Date,
        nullable=False
    )

    contract_value = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(50),
        default="Active"
    )

    terms_conditions = Column(
        String(1000),
        nullable=True
    )

    vendor = relationship("Vendor")

    @property
    def contract_name(self) -> str:
        return self.contract_title or ""

    @contract_name.setter
    def contract_name(self, value: str):
        self.contract_title = value

    @property
    def description(self) -> str:
        return self.terms_conditions or ""

    @description.setter
    def description(self, value: str):
        self.terms_conditions = value

    @property
    def currency(self) -> str:
        return "USD"

