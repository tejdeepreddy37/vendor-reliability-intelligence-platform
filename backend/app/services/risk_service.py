from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.risk import (
    create_risk,
    get_all_risks,
    get_risk_by_id,
    get_risks_by_vendor,
    update_risk,
    delete_risk,
)

from app.crud.vendor import get_vendor_by_id

from app.models.risk import Risk
from app.schemas.risk import RiskCreate, RiskUpdate


def create_risk_service(
    db: Session,
    risk: RiskCreate,
):
    vendor = get_vendor_by_id(db, risk.vendor_id)

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    new_risk = Risk(
        vendor_id=risk.vendor_id,
        risk_type=risk.risk_type,
        severity=risk.severity,
        description=risk.description,
        impact_score=risk.impact_score,
        status=risk.status or "Open",
    )

    return create_risk(db, new_risk)


def get_all_risks_service(db: Session):
    return get_all_risks(db)


def get_risk_by_id_service(
    db: Session,
    risk_id: int,
):
    risk = get_risk_by_id(db, risk_id)

    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found",
        )

    return risk


def get_risks_by_vendor_service(
    db: Session,
    vendor_id: int,
):
    return get_risks_by_vendor(db, vendor_id)


def update_risk_service(
    db: Session,
    risk_id: int,
    risk_data: RiskUpdate,
):
    risk = get_risk_by_id(db, risk_id)

    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found",
        )

    update_data = risk_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(risk, key, value)

    return update_risk(db, risk)


def delete_risk_service(
    db: Session,
    risk_id: int,
):
    risk = get_risk_by_id(db, risk_id)

    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found",
        )

    delete_risk(db, risk)

    return {
        "message": "Risk deleted successfully"
    }
