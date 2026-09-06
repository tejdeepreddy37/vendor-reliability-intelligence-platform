from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.contract import Contract
from app.models.communication import Communication
from app.models.risk import Risk
from app.models.vendor_performance import VendorPerformance

from app.schemas.dashboard import (
    DashboardSummary,
    SpendVelocityAnalytics,
    MonthlySpendPoint,
)

MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_FULLS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def get_spend_velocity_analytics(
    db: Session,
    year: Optional[int] = None
) -> SpendVelocityAnalytics:
    # 1. Query available distinct years in purchase orders
    year_rows = (
        db.query(func.distinct(func.extract("year", PurchaseOrder.order_date)))
        .filter(PurchaseOrder.order_date != None)
        .all()
    )
    available_years = sorted(
        [int(r[0]) for r in year_rows if r[0] is not None],
        reverse=True
    )
    if not available_years:
        available_years = [2026, 2025]

    target_year = year if year in available_years else available_years[0]

    # 2. Query all purchase orders for target year
    pos = (
        db.query(PurchaseOrder)
        .filter(func.extract("year", PurchaseOrder.order_date) == target_year)
        .all()
    )

    # 3. Cache vendors for top vendor resolution
    vendors = db.query(Vendor).all()
    vendor_map = {v.id: v.company_name for v in vendors if v.id is not None}

    # 4. Build monthly data points
    monthly_data: list[MonthlySpendPoint] = []
    total_spend_year = 0.0
    total_orders_year = 0
    peak_month = None
    peak_spend = 0.0

    for i in range(1, 13):
        m_abbr = MONTH_ABBRS[i - 1]
        m_full = MONTH_FULLS[i - 1]

        m_pos = [p for p in pos if p.order_date and p.order_date.month == i]
        m_count = len(m_pos)
        m_spend = float(sum(p.total_amount or 0.0 for p in m_pos))
        m_avg = round(m_spend / m_count, 2) if m_count > 0 else 0.0

        vendor_ids = {p.vendor_id for p in m_pos if p.vendor_id is not None}
        active_vendors_count = len(vendor_ids)

        completed_count = len([
            p for p in m_pos
            if (p.status or "").lower() in ["delivered", "completed", "received"]
        ])
        pending_count = len([
            p for p in m_pos
            if (p.status or "").lower() in ["ordered", "pending", "in transit", "in_progress"]
        ])

        # Top vendor by spend in this month
        top_vendor_name = None
        if m_pos:
            vendor_spend: dict[int, float] = {}
            for p in m_pos:
                if p.vendor_id:
                    vendor_spend[p.vendor_id] = vendor_spend.get(p.vendor_id, 0.0) + (p.total_amount or 0.0)
            if vendor_spend:
                top_v_id = max(vendor_spend, key=vendor_spend.get)
                top_vendor_name = vendor_map.get(top_v_id, f"Vendor #{top_v_id}")

        monthly_data.append(
            MonthlySpendPoint(
                month=m_abbr,
                month_full=m_full,
                month_index=i,
                year=target_year,
                purchase_orders_count=m_count,
                total_spend=round(m_spend, 2),
                average_order_value=m_avg,
                active_vendors_count=active_vendors_count,
                completed_orders_count=completed_count,
                pending_orders_count=pending_count,
                top_vendor_name=top_vendor_name,
            )
        )

        total_spend_year += m_spend
        total_orders_year += m_count

        if m_spend > peak_spend:
            peak_spend = m_spend
            peak_month = m_abbr

    avg_order_value_year = (
        round(total_spend_year / total_orders_year, 2)
        if total_orders_year > 0
        else 0.0
    )

    total_communications_year = (
        db.query(func.count(Communication.id)).scalar() or 0
    )

    active_contracts = (
        db.query(Contract)
        .filter(Contract.status == "Active")
        .all()
    )
    avg_contract_val = (
        sum(c.contract_value or 0.0 for c in active_contracts) / len(active_contracts)
        if active_contracts
        else 0.0
    )

    return SpendVelocityAnalytics(
        year=target_year,
        available_years=available_years,
        monthly_data=monthly_data,
        total_spend_year=round(total_spend_year, 2),
        total_orders_year=total_orders_year,
        average_order_value_year=avg_order_value_year,
        peak_month=peak_month,
        peak_spend=round(peak_spend, 2),
        total_communications_year=total_communications_year,
        average_contract_value_year=round(avg_contract_val, 2),
    )


def get_dashboard_summary(db: Session) -> DashboardSummary:
    total_vendors = (
        db.query(func.count(Vendor.id)).scalar() or 0
    )

    active_vendors = (
        db.query(func.count(Vendor.id))
        .filter(Vendor.is_active == True)
        .scalar()
        or 0
    )

    pending_vendors = (
        db.query(func.count(Vendor.id))
        .filter(Vendor.status == "Pending")
        .scalar()
        or 0
    )

    total_purchase_orders = (
        db.query(func.count(PurchaseOrder.id)).scalar() or 0
    )

    active_contracts = (
        db.query(func.count(Contract.id))
        .filter(Contract.status == "Active")
        .scalar()
        or 0
    )

    high_risk_vendors = (
        db.query(func.count(func.distinct(Risk.vendor_id)))
        .filter(
            Risk.severity.in_(["HIGH", "High", "high"])
        )
        .scalar()
        or 0
    )

    total_contract_value = (
        db.query(
            func.coalesce(
                func.sum(Contract.contract_value),
                0,
            )
        ).scalar()
        or 0
    )

    total_procurement_value = (
        db.query(
            func.coalesce(
                func.sum(PurchaseOrder.total_amount),
                0,
            )
        ).scalar()
        or 0
    )

    total_communications = (
        db.query(func.count(Communication.id)).scalar() or 0
    )

    # -------------------------------------------------------------------------
    # Risk Severity Breakdown
    # -------------------------------------------------------------------------
    critical_risks = (
        db.query(func.count(Risk.id))
        .filter(func.lower(Risk.severity) == "critical")
        .scalar()
        or 0
    )

    high_risks = (
        db.query(func.count(Risk.id))
        .filter(func.lower(Risk.severity) == "high")
        .scalar()
        or 0
    )

    medium_risks = (
        db.query(func.count(Risk.id))
        .filter(func.lower(Risk.severity) == "medium")
        .scalar()
        or 0
    )

    low_risks = (
        db.query(func.count(Risk.id))
        .filter(func.lower(Risk.severity) == "low")
        .scalar()
        or 0
    )

    # -------------------------------------------------------------------------
    # Portfolio Vendor Reliability Metrics
    # -------------------------------------------------------------------------
    performance_records = db.query(VendorPerformance).all()
    all_risks = db.query(Risk).all()

    if performance_records:
        del_scores = []
        qual_scores = []
        comp_scores = []
        comm_scores = []
        risk_scores = []
        overall_scores = []

        for p in performance_records:
            total_del = (p.on_time_deliveries or 0) + (p.delayed_deliveries or 0)
            d_score = (
                ((p.on_time_deliveries or 0) / total_del) * 100
                if total_del > 0
                else 0.0
            )
            del_scores.append(d_score)

            q_score = min(max(((p.quality_rating or 0.0) / 5.0) * 100, 0), 100)
            qual_scores.append(q_score)

            c_score = min(max(p.order_completion_rate or 0.0, 0), 100)
            comp_scores.append(c_score)

            r_time = p.response_time or 0.0
            if r_time <= 4:
                cm_score = 100.0
            elif r_time <= 8:
                cm_score = 80.0
            elif r_time <= 24:
                cm_score = 60.0
            elif r_time <= 48:
                cm_score = 40.0
            else:
                cm_score = 20.0
            comm_scores.append(cm_score)

            v_risks = [r for r in all_risks if r.vendor_id == p.vendor_id]
            if v_risks:
                tot_imp = sum(float(r.impact_score or 0) for r in v_risks)
                r_score = max(0.0, 100.0 - min(tot_imp * 5, 100.0))
            else:
                r_score = 100.0
            risk_scores.append(r_score)

            ov_score = round(
                min(
                    max(
                        d_score * 0.30
                        + q_score * 0.25
                        + c_score * 0.20
                        + cm_score * 0.15
                        + r_score * 0.10,
                        0,
                    ),
                    100,
                ),
                2,
            )
            overall_scores.append(ov_score)

        count = len(performance_records)
        average_delivery_score = round(sum(del_scores) / count, 2)
        average_quality_score = round(sum(qual_scores) / count, 2)
        average_compliance_score = round(sum(comp_scores) / count, 2)
        average_communication_score = round(sum(comm_scores) / count, 2)
        average_risk_score = round(sum(risk_scores) / count, 2)
        overall_reliability_score = round(sum(overall_scores) / count, 2)
        average_performance = round(
            sum(float(p.performance_score or 0) for p in performance_records)
            / count,
            2,
        )
    else:
        average_delivery_score = 0.0
        average_quality_score = 0.0
        average_compliance_score = 0.0
        average_communication_score = 0.0
        average_risk_score = 0.0
        overall_reliability_score = 0.0
        average_performance = 0.0

    return DashboardSummary(
        total_vendors=total_vendors,
        active_vendors=active_vendors,
        pending_vendors=pending_vendors,
        total_purchase_orders=total_purchase_orders,
        active_contracts=active_contracts,
        high_risk_vendors=high_risk_vendors,
        total_contract_value=float(total_contract_value),
        total_procurement_value=float(total_procurement_value),
        total_communications=total_communications,
        average_performance=average_performance,
        critical_risks=critical_risks,
        high_risks=high_risks,
        medium_risks=medium_risks,
        low_risks=low_risks,
        average_delivery_score=average_delivery_score,
        average_quality_score=average_quality_score,
        average_compliance_score=average_compliance_score,
        average_communication_score=average_communication_score,
        average_risk_score=average_risk_score,
        overall_reliability_score=overall_reliability_score,
    )
