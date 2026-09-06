from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
)

from app.services.report_service import (
    create_report_service,
    get_all_reports_service,
    get_report_by_id_service,
    update_report_service,
    delete_report_service,
    generate_and_record_report_service,
    export_report_csv_service,
    export_analytics_csv_service,
    export_report_excel_service,
    export_analytics_excel_service,
    export_report_pdf_service,
    export_analytics_pdf_service,
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_report_service(
        db,
        report,
    )


@router.post(
    "/generate",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_procurement_report(
    report_type: str = Query("Procurement Summary"),
    file_format: str = Query("CSV"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return generate_and_record_report_service(
        db=db,
        report_type=report_type,
        user_name=current_user.full_name or current_user.email,
        file_format=file_format,
    )


@router.get(
    "/export-csv",
)
def export_analytics_csv(
    category: str = Query("Procurement"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content, filename = export_analytics_csv_service(db, category)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/export-excel",
)
def export_analytics_excel(
    category: str = Query("Procurement"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content, filename = export_analytics_excel_service(db, category)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/export-pdf",
)
def export_analytics_pdf(
    category: str = Query("Procurement"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content, filename = export_analytics_pdf_service(db, category)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{report_id}/export",
)
def export_report_by_id(
    report_id: int,
    format: str = Query("CSV"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fmt = format.upper()
    if fmt == "PDF":
        content, filename = export_report_pdf_service(db, report_id)
        media_type = "application/pdf"
    elif fmt in ("EXCEL", "XLSX"):
        content, filename = export_report_excel_service(db, report_id)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        content, filename = export_report_csv_service(db, report_id)
        media_type = "text/csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "",
    response_model=list[ReportResponse],
)
def get_all_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_all_reports_service(db)


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
)
def get_report_by_id(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_report_by_id_service(
        db,
        report_id,
    )


@router.put(
    "/{report_id}",
    response_model=ReportResponse,
)
def update_report(
    report_id: int,
    report: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_report_service(
        db,
        report_id,
        report,
    )


@router.delete(
    "/{report_id}",
)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_report_service(
        db,
        report_id,
    )