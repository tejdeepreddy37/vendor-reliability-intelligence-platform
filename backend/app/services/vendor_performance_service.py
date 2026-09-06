from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.vendor_performance import (
    get_vendor_performance_by_id,
    get_vendor_performance_by_vendor_id,
    get_all_vendor_performance,
    create_vendor_performance,
    update_vendor_performance,
    delete_vendor_performance,
)

from app.crud.vendor import get_vendor_by_id

from app.models.vendor_performance import VendorPerformance

from app.schemas.vendor_performance import (
    VendorPerformanceCreate,
    VendorPerformanceUpdate,
)


def calculate_performance_score(
    on_time_deliveries: int,
    delayed_deliveries: int,
    quality_rating: float,
    response_time: float,
    issue_resolution_time: float,
    order_completion_rate: float,
    service_rating: float,
) -> float:
    total_deliveries = on_time_deliveries + delayed_deliveries

    delivery_score = (
        (on_time_deliveries / total_deliveries) * 100
        if total_deliveries > 0
        else 0
    )

    quality_score = min(max(quality_rating / 5 * 100, 0), 100)
    service_score = min(max(service_rating / 5 * 100, 0), 100)
    completion_score = min(max(order_completion_rate, 0), 100)

    response_score = max(
        0,
        min(100, 100 - (response_time / 24 * 100)),
    )

    resolution_score = max(
        0,
        min(100, 100 - (issue_resolution_time / 72 * 100)),
    )

    score = (
        delivery_score * 0.25
        + quality_score * 0.20
        + response_score * 0.10
        + resolution_score * 0.10
        + completion_score * 0.20
        + service_score * 0.15
    )

    return round(score, 2)


def create_vendor_performance_service(
    db: Session,
    performance: VendorPerformanceCreate,
):
    vendor = get_vendor_by_id(
        db,
        performance.vendor_id,
    )

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    existing = get_vendor_performance_by_vendor_id(
        db,
        performance.vendor_id,
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor performance already exists for this vendor",
        )

    performance_score = calculate_performance_score(
        on_time_deliveries=performance.on_time_deliveries,
        delayed_deliveries=performance.delayed_deliveries,
        quality_rating=performance.quality_rating,
        response_time=performance.response_time,
        issue_resolution_time=performance.issue_resolution_time,
        order_completion_rate=performance.order_completion_rate,
        service_rating=performance.service_rating,
    )

    new_performance = VendorPerformance(
        vendor_id=performance.vendor_id,
        on_time_deliveries=performance.on_time_deliveries,
        delayed_deliveries=performance.delayed_deliveries,
        quality_rating=performance.quality_rating,
        response_time=performance.response_time,
        issue_resolution_time=performance.issue_resolution_time,
        order_completion_rate=performance.order_completion_rate,
        service_rating=performance.service_rating,
        performance_score=performance_score,
    )

    return create_vendor_performance(
        db,
        new_performance,
    )


def get_all_vendor_performance_service(
    db: Session,
):
    return get_all_vendor_performance(db)


def get_vendor_performance_by_id_service(
    db: Session,
    performance_id: int,
):
    performance = get_vendor_performance_by_id(
        db,
        performance_id,
    )

    if not performance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor performance not found",
        )

    return performance


def get_vendor_performance_by_vendor_id_service(
    db: Session,
    vendor_id: int,
):
    performance = get_vendor_performance_by_vendor_id(
        db,
        vendor_id,
    )

    if not performance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor performance not found",
        )

    return performance


def update_vendor_performance_service(
    db: Session,
    performance_id: int,
    performance_data: VendorPerformanceUpdate,
):
    performance = get_vendor_performance_by_id(
        db,
        performance_id,
    )

    if not performance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor performance not found",
        )

    update_data = performance_data.model_dump(
        exclude_unset=True,
    )

    for key, value in update_data.items():
        setattr(performance, key, value)

    performance.performance_score = calculate_performance_score(
        on_time_deliveries=performance.on_time_deliveries or 0,
        delayed_deliveries=performance.delayed_deliveries or 0,
        quality_rating=performance.quality_rating or 0.0,
        response_time=performance.response_time or 0.0,
        issue_resolution_time=performance.issue_resolution_time or 0.0,
        order_completion_rate=performance.order_completion_rate or 0.0,
        service_rating=performance.service_rating or 0.0,
    )

    return update_vendor_performance(
        db,
        performance,
    )


def delete_vendor_performance_service(
    db: Session,
    performance_id: int,
):
    performance = get_vendor_performance_by_id(
        db,
        performance_id,
    )

    if not performance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor performance not found",
        )

    delete_vendor_performance(
        db,
        performance,
    )

    return {
        "message": "Vendor Performance deleted successfully"
    }