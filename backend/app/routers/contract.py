from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.user import User

from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
)

from app.services.contract_service import (
    create_contract_service,
    get_all_contracts_service,
    get_contract_by_id_service,
    update_contract_service,
    delete_contract_service,
    get_expiring_contracts_service,
)

router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"],
)


@router.post(
    "",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_contract(
    contract: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_contract_service(db, contract)


@router.get(
    "",
    response_model=list[ContractResponse],
)
def get_all_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_all_contracts_service(db)


@router.get(
    "/expiring",
    response_model=list[ContractResponse],
)
def get_expiring_contracts(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return active contracts expiring within the next `days` days (default 30)."""
    return get_expiring_contracts_service(db, days)


@router.get(
    "/vendor/{vendor_id}",
    response_model=list[ContractResponse],
)
def get_contracts_by_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.contract_service import get_contracts_by_vendor_service
    return get_contracts_by_vendor_service(db, vendor_id)


@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
)
def get_contract_by_id(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_contract_by_id_service(db, contract_id)


@router.put(
    "/{contract_id}",
    response_model=ContractResponse,
)
def update_contract(
    contract_id: int,
    contract: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_contract_service(
        db,
        contract_id,
        contract,
    )


@router.delete("/{contract_id}")
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_contract_service(db, contract_id)