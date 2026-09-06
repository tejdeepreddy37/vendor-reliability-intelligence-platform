from pydantic import BaseModel
from typing import Optional, List


class MonthlySpendPoint(BaseModel):
    month: str
    month_full: str
    month_index: int
    year: int
    purchase_orders_count: int
    total_spend: float
    average_order_value: float
    active_vendors_count: int
    completed_orders_count: int
    pending_orders_count: int
    top_vendor_name: Optional[str] = None


class SpendVelocityAnalytics(BaseModel):
    year: int
    available_years: List[int]
    monthly_data: List[MonthlySpendPoint]
    total_spend_year: float
    total_orders_year: int
    average_order_value_year: float
    peak_month: Optional[str] = None
    peak_spend: float = 0.0
    total_communications_year: int = 0
    average_contract_value_year: float = 0.0


class DashboardSummary(BaseModel):
    total_vendors: int
    active_vendors: int
    pending_vendors: int
    total_purchase_orders: int
    active_contracts: int
    high_risk_vendors: int
    total_contract_value: float
    total_procurement_value: float
    total_communications: int
    average_performance: float

    # Risk Intelligence Breakdown
    critical_risks: int = 0
    high_risks: int = 0
    medium_risks: int = 0
    low_risks: int = 0

    # Portfolio Reliability Metrics
    average_delivery_score: float = 0.0
    average_quality_score: float = 0.0
    average_compliance_score: float = 0.0
    average_communication_score: float = 0.0
    average_risk_score: float = 0.0
    overall_reliability_score: float = 0.0
