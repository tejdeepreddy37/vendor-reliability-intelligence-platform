from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.contract import (
    get_contract_by_id,
    get_contract_by_number,
    get_all_contracts,
    get_expiring_contracts,
    create_contract,
    update_contract,
    delete_contract,
)

from app.crud.vendor import get_vendor_by_id

from app.models.contract import Contract

from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
)


def create_contract_service(
    db: Session,
    contract: ContractCreate,
):
    existing = get_contract_by_number(
        db,
        contract.contract_number,
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract already exists",
        )

    vendor = get_vendor_by_id(db, contract.vendor_id)

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    data = contract.model_dump()
    contract_title = data.pop("contract_name", None) or data.pop("contract_title", None)
    data.pop("currency", None)
    description = data.pop("description", None)
    terms = data.pop("terms_conditions", None) or description

    new_contract = Contract(
        contract_number=data["contract_number"],
        vendor_id=data["vendor_id"],
        start_date=data["start_date"],
        end_date=data["end_date"],
        contract_value=data.get("contract_value"),
        status=data.get("status", "Active"),
        contract_title=contract_title,
        terms_conditions=terms,
    )

    return create_contract(db, new_contract)


def get_all_contracts_service(db: Session):
    return get_all_contracts(db)


def get_contracts_by_vendor_service(db: Session, vendor_id: int):
    from app.crud.contract import get_contracts_by_vendor
    return get_contracts_by_vendor(db, vendor_id)


def get_contract_by_id_service(
    db: Session,
    contract_id: int,
):
    contract = get_contract_by_id(db, contract_id)

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    return contract


def update_contract_service(
    db: Session,
    contract_id: int,
    contract_data: ContractUpdate,
):
    contract = get_contract_by_id(db, contract_id)

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    update_data = contract_data.model_dump(exclude_unset=True)

    if "contract_name" in update_data:
        contract.contract_title = update_data.pop("contract_name")
    if "description" in update_data:
        contract.terms_conditions = update_data.pop("description")
    update_data.pop("currency", None)

    for key, value in update_data.items():
        if hasattr(contract, key):
            setattr(contract, key, value)

    return update_contract(db, contract)



def delete_contract_service(
    db: Session,
    contract_id: int,
):
    contract = get_contract_by_id(db, contract_id)

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found",
        )

    delete_contract(db, contract)

    return {
        "message": "Contract deleted successfully"
    }


def get_expiring_contracts_service(db: Session, days: int = 30):
    """Return active contracts expiring within `days` days."""
    return get_expiring_contracts(db, days)