from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.vendor import (
    create_vendor,
    delete_vendor,
    get_all_vendors,
    get_vendor_by_email,
    get_vendor_by_id,
    update_vendor,
)
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate


def create_vendor_service(db: Session, vendor: VendorCreate):
    existing_vendor = get_vendor_by_email(db, vendor.email)

    if existing_vendor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor email already exists",
        )

    new_vendor = Vendor(
        vendor_name=vendor.contact_person or vendor.company_name,
        company_name=vendor.company_name,
        contact_person=vendor.contact_person,
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        category=vendor.category,
        status="Pending",
        is_active=True,
    )

    return create_vendor(db, new_vendor)


def get_all_vendors_service(db: Session):
    return get_all_vendors(db)


def get_vendor_by_id_service(db: Session, vendor_id: int):
    vendor = get_vendor_by_id(db, vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    return vendor


def update_vendor_service(
    db: Session,
    vendor_id: int,
    vendor_data: VendorUpdate,
):
    vendor = get_vendor_by_id(db, vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    update_data = vendor_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(vendor, key, value)

    return update_vendor(db, vendor)


def delete_vendor_service(db: Session, vendor_id: int):
    vendor = get_vendor_by_id(db, vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    delete_vendor(db, vendor)

    return {
        "message": "Vendor deleted successfully"
    }