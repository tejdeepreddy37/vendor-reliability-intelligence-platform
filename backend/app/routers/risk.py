from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

from app.schemas.risk import (
    RiskCreate,
    RiskUpdate,
    RiskResponse,
)

from app.services.risk_service import (
    create_risk_service,
    get_all_risks_service,
    get_risk_by_id_service,
    get_risks_by_vendor_service,
    update_risk_service,
    delete_risk_service,
)

router = APIRouter(
    prefix="/risks",
    tags=["Risks"],
)


@router.post(
    "",
    response_model=RiskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(
    risk: RiskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_risk_service(db, risk)


@router.get(
    "",
    response_model=List[RiskResponse],
)
def get_all_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_all_risks_service(db)


@router.get(
    "/vendor/{vendor_id}",
    response_model=List[RiskResponse],
)
def get_risks_by_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_risks_by_vendor_service(db, vendor_id)


@router.get(
    "/{risk_id}",
    response_model=RiskResponse,
)
def get_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_risk_by_id_service(db, risk_id)


@router.put(
    "/{risk_id}",
    response_model=RiskResponse,
)
def update_risk(
    risk_id: int,
    risk: RiskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_risk_service(db, risk_id, risk)


@router.delete(
    "/{risk_id}",
    status_code=status.HTTP_200_OK,
)
def delete_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_risk_service(db, risk_id)