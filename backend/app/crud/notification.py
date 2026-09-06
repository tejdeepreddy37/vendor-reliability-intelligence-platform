from sqlalchemy.orm import Session

from app.models.notification import Notification


def get_notification_by_id(
    db: Session,
    notification_id: int,
):
    return (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )


def get_all_notifications(
    db: Session,
):
    return db.query(Notification).all()


def create_notification(
    db: Session,
    notification: Notification,
):
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def update_notification(
    db: Session,
    notification: Notification,
):
    db.commit()
    db.refresh(notification)
    return notification


def delete_notification(
    db: Session,
    notification: Notification,
):
    db.delete(notification)
    db.commit()


def mark_all_notifications_read(
    db: Session,
):
    updated_count = (
        db.query(Notification)
        .filter(Notification.status == "Unread")
        .update({"status": "Read"})
    )
    db.commit()
    return updated_count


def get_notification_by_title(
    db: Session,
    title: str,
):
    return (
        db.query(Notification)
        .filter(Notification.title == title)
        .first()
    )