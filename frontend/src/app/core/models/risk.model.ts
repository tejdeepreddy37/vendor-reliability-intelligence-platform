export interface Risk {
  id?: number;
  vendor_id: number;
  risk_type: string;
  severity: string;
  description?: string;
  impact_score: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiskCreateDto {
  vendor_id: number;
  risk_type: string;
  severity: string;
  description?: string;
  impact_score: number;
  status?: string;
}

export interface RiskUpdateDto {
  vendor_id?: number;
  risk_type?: string;
  severity?: string;
  description?: string;
  impact_score?: number;
  status?: string;
}
