from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

from app.schemas.dashboard import (
    DashboardSummary,
    SpendVelocityAnalytics,
)

from app.services.dashboard_service import (
    get_dashboard_summary,
    get_spend_velocity_analytics,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/summary",
    response_model=DashboardSummary,
)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dashboard_summary(db)


@router.get(
    "/spend-velocity",
    response_model=SpendVelocityAnalytics,
)
def spend_velocity_analytics(
    year: Optional[int] = Query(default=None, description="Year for spend velocity breakdown"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve monthly procurement spend velocity and purchase order volume analytics."""
    return get_spend_velocity_analytics(db, year)