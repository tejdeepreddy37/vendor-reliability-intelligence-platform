from datetime import date, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.notification import (
    create_notification,
    get_all_notifications,
    get_notification_by_id,
    get_notification_by_title,
    update_notification,
    delete_notification,
    mark_all_notifications_read,
)

from app.models.notification import Notification
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.contract import Contract
from app.models.risk import Risk

from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
)


def create_notification_service(
    db: Session,
    notification: NotificationCreate,
):
    new_notification = Notification(
        **notification.model_dump()
    )

    return create_notification(
        db,
        new_notification,
    )


def get_all_notifications_service(
    db: Session,
):
    return get_all_notifications(db)


def get_notification_by_id_service(
    db: Session,
    notification_id: int,
):
    notification = get_notification_by_id(
        db,
        notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification


def update_notification_service(
    db: Session,
    notification_id: int,
    notification: NotificationUpdate,
):
    db_notification = get_notification_by_id(
        db,
        notification_id,
    )

    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    update_data = notification.model_dump(
        exclude_unset=True,
    )

    for key, value in update_data.items():
        setattr(db_notification, key, value)

    return update_notification(
        db,
        db_notification,
    )


def mark_notification_as_read_service(
    db: Session,
    notification_id: int,
):
    db_notification = get_notification_by_id(
        db,
        notification_id,
    )

    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db_notification.status = "Read"
    return update_notification(db, db_notification)


def mark_all_notifications_read_service(
    db: Session,
):
    count = mark_all_notifications_read(db)
    return {"message": f"{count} notifications marked as read"}


def delete_notification_service(
    db: Session,
    notification_id: int,
):
    db_notification = get_notification_by_id(
        db,
        notification_id,
    )

    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    delete_notification(
        db,
        db_notification,
    )

    return {
        "message": "Notification deleted successfully"
    }


def sync_procurement_alerts_service(
    db: Session,
    recipient_email: str = "procurement@vrip.enterprise",
):
    """
    Scans real PostgreSQL database for actual business events:
    1. Contract Expiry Alerts (active contracts ending within 30 days)
    2. Delivery Delay Notifications (orders past expected delivery date)
    3. Vendor Approval Notifications (vendors pending review)
    4. Compliance & Risk Alerts (critical / high severity open risks)
    5. Procurement Alerts (pending or high-value purchase orders)
    """
    created_alerts = []
    today = date.today()

    # 1. Contract Expiry
    contracts = db.query(Contract).filter(Contract.status == "Active").all()
    for c in contracts:
        if c.end_date and c.end_date <= today + timedelta(days=30):
            days_left = (c.end_date - today).days
            title = f"Contract Expiry Warning: {c.contract_title or c.contract_number}"
            existing = get_notification_by_title(db, title)
            if not existing:
                msg = f"Contract #{c.contract_number} for vendor ID #{c.vendor_id} is scheduled to expire in {max(days_left, 0)} days on {c.end_date}."
                notif = Notification(
                    title=title,
                    message=msg,
                    recipient=recipient_email,
                    notification_type="Contract Expiry",
                    status="Unread",
                )
                created_alerts.append(create_notification(db, notif))

    # 2. Delivery Delays
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.status.notin_(["Delivered", "Cancelled"])).all()
    for po in pos:
        if po.expected_delivery and po.expected_delivery < today:
            days_overdue = (today - po.expected_delivery).days
            title = f"Delivery Delay Alert: PO #{po.po_number}"
            existing = get_notification_by_title(db, title)
            if not existing:
                msg = f"Purchase Order #{po.po_number} is {days_overdue} day(s) overdue from expected delivery date {po.expected_delivery}."
                notif = Notification(
                    title=title,
                    message=msg,
                    recipient=recipient_email,
                    notification_type="Delivery Delay",
                    status="Unread",
                )
                created_alerts.append(create_notification(db, notif))

    # 3. Vendor Approvals
    pending_vendors = db.query(Vendor).filter(Vendor.status == "Pending").all()
    for v in pending_vendors:
        title = f"Vendor Approval Required: {v.company_name}"
        existing = get_notification_by_title(db, title)
        if not existing:
            msg = f"Supplier {v.company_name} (Category: {v.category}) has submitted onboarding documentation and is awaiting procurement review."
            notif = Notification(
                title=title,
                message=msg,
                recipient=recipient_email,
                notification_type="Vendor Approval",
                status="Unread",
            )
            created_alerts.append(create_notification(db, notif))

    # 4. Compliance & Risk Incidents
    high_risks = db.query(Risk).filter(Risk.severity.in_(["High", "Critical"]), Risk.status.in_(["Open", "Under Review"])).all()
    for r in high_risks:
        title = f"High Risk Incident: {r.risk_type} - Vendor #{r.vendor_id}"
        existing = get_notification_by_title(db, title)
        if not existing:
            msg = f"Severity: {r.severity}. Impact Score: {r.impact_score}. Description: {r.description}"
            notif = Notification(
                title=title,
                message=msg,
                recipient=recipient_email,
                notification_type="Compliance",
                status="Unread",
            )
            created_alerts.append(create_notification(db, notif))

    # 5. Procurement Alerts
    open_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status == "Ordered").all()
    for po in open_pos:
        title = f"Procurement Order Scheduled: PO #{po.po_number}"
        existing = get_notification_by_title(db, title)
        if not existing:
            msg = f"Order #{po.po_number} with total value ${po.total_amount:,.2f} is in fulfillment cycle."
            notif = Notification(
                title=title,
                message=msg,
                recipient=recipient_email,
                notification_type="Procurement",
                status="Unread",
            )
            created_alerts.append(create_notification(db, notif))

    return get_all_notifications(db)