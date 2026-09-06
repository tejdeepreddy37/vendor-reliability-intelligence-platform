from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.vendor import get_vendor_by_id
from app.crud.vendor_performance import get_vendor_performance_by_vendor_id
from app.models.risk import Risk


def calculate_reliability(
    db: Session,
    vendor_id: int,
):
    vendor = get_vendor_by_id(db, vendor_id)

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )

    performance = get_vendor_performance_by_vendor_id(
        db,
        vendor_id,
    )

    if not performance:
        risks = (
            db.query(Risk)
            .filter(Risk.vendor_id == vendor_id)
            .all()
        )

        if risks:
            total_impact = sum(
                float(risk.impact_score or 0)
                for risk in risks
            )
            risk_score = max(
                0.0,
                100.0 - min(total_impact * 5, 100.0),
            )
        else:
            risk_score = 100.0

        overall_score = round(risk_score * 0.10 + 70.0 * 0.90, 2)
        risk_level = "LOW" if overall_score >= 80 else ("MEDIUM" if overall_score >= 60 else "HIGH")

        return {
            "vendor_id": vendor_id,
            "delivery_score": 0.0,
            "quality_score": 0.0,
            "compliance_score": 0.0,
            "communication_score": 0.0,
            "risk_score": round(risk_score, 2),
            "overall_reliability_score": overall_score,
            "risk_level": risk_level,
            "recommendations": [
                "Awaiting initial performance cycle data. Baseline risk monitoring is active."
            ],
        }

    total_deliveries = (
        performance.on_time_deliveries
        + performance.delayed_deliveries
    )

    if total_deliveries > 0:
        delivery_score = (
            performance.on_time_deliveries
            / total_deliveries
        ) * 100
    else:
        delivery_score = 0.0

    quality_score = min(
        max(performance.quality_rating / 5 * 100, 0),
        100,
    )

    compliance_score = min(
        max(performance.order_completion_rate, 0),
        100,
    )

    # Lower response time means better communication.
    if performance.response_time <= 4:
        communication_score = 100.0
    elif performance.response_time <= 8:
        communication_score = 80.0
    elif performance.response_time <= 24:
        communication_score = 60.0
    elif performance.response_time <= 48:
        communication_score = 40.0
    else:
        communication_score = 20.0

    risks = (
        db.query(Risk)
        .filter(Risk.vendor_id == vendor_id)
        .all()
    )

    if risks:
        total_impact = sum(
            float(risk.impact_score or 0)
            for risk in risks
        )

        risk_score = max(
            0.0,
            100.0 - min(total_impact * 5, 100.0),
        )
    else:
        risk_score = 100.0

    overall_score = (
        delivery_score * 0.30
        + quality_score * 0.25
        + compliance_score * 0.20
        + communication_score * 0.15
        + risk_score * 0.10
    )

    overall_score = round(
        min(max(overall_score, 0), 100),
        2,
    )

    if overall_score >= 80:
        risk_level = "LOW"
    elif overall_score >= 60:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # ── Procurement Recommendations ──────────────────────────────────
    recommendations = []

    if delivery_score < 70:
        recommendations.append(
            "Delivery performance is below threshold. Review SLA terms and consider issuing a formal improvement notice."
        )
    if quality_score < 70:
        recommendations.append(
            "Quality rating is below acceptable levels. Schedule a quality audit and request corrective action plan."
        )
    if compliance_score < 70:
        recommendations.append(
            "Order completion rate is low. Evaluate vendor capacity and consider partial order redistribution."
        )
    if communication_score < 60:
        recommendations.append(
            "Response times exceed acceptable limits. Establish a dedicated communication channel and escalation protocol."
        )
    if risk_score < 70:
        recommendations.append(
            "Multiple active risk factors detected. Conduct a vendor risk review and consider alternative sourcing."
        )
    if overall_score >= 80:
        recommendations.append(
            "Vendor is performing well. Continue monitoring and consider for preferred supplier status."
        )
    elif overall_score >= 60:
        recommendations.append(
            "Vendor is at medium risk. Increase monitoring frequency and request performance improvement plan."
        )
    else:
        recommendations.append(
            "Vendor is high risk. Initiate contingency sourcing and escalate to procurement management."
        )

    return {
        "vendor_id": vendor_id,
        "delivery_score": round(delivery_score, 2),
        "quality_score": round(quality_score, 2),
        "compliance_score": round(compliance_score, 2),
        "communication_score": round(communication_score, 2),
        "risk_score": round(risk_score, 2),
        "overall_reliability_score": overall_score,
        "risk_level": risk_level,
        "recommendations": recommendations,
    }
