from sqlalchemy.orm import Session

from app.models.risk import Risk


def create_risk(db: Session, risk: Risk):
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


def get_all_risks(db: Session):
    return db.query(Risk).all()


def get_risk_by_id(db: Session, risk_id: int):
    return db.query(Risk).filter(Risk.id == risk_id).first()


def get_risks_by_vendor(db: Session, vendor_id: int):
    return db.query(Risk).filter(Risk.vendor_id == vendor_id).all()


def update_risk(db: Session, risk: Risk):
    db.commit()
    db.refresh(risk)
    return risk


def delete_risk(db: Session, risk: Risk):
    db.delete(risk)
    db.commit()