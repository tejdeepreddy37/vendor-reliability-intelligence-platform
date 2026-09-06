export interface MonthlySpendPoint {
  month: string;
  month_full: string;
  month_index: number;
  year: number;
  purchase_orders_count: number;
  total_spend: number;
  average_order_value: number;
  active_vendors_count: number;
  completed_orders_count: number;
  pending_orders_count: number;
  top_vendor_name?: string | null;
}

export interface SpendVelocityAnalytics {
  year: number;
  available_years: number[];
  monthly_data: MonthlySpendPoint[];
  total_spend_year: number;
  total_orders_year: number;
  average_order_value_year: number;
  peak_month?: string | null;
  peak_spend: number;
  total_communications_year: number;
  average_contract_value_year: number;
}

export interface DashboardSummary {
  total_vendors: number;
  active_vendors: number;
  pending_vendors: number;
  total_purchase_orders: number;
  active_contracts: number;
  high_risk_vendors: number;
  total_contract_value: number;
  total_procurement_value: number;
  total_communications: number;
  average_performance: number;

  critical_risks?: number;
  high_risks?: number;
  medium_risks?: number;
  low_risks?: number;

  average_delivery_score?: number;
  average_quality_score?: number;
  average_compliance_score?: number;
  average_communication_score?: number;
  average_risk_score?: number;
  overall_reliability_score?: number;
}
