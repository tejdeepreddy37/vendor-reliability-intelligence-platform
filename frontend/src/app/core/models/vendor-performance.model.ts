export interface VendorPerformance {
  id?: number;
  vendor_id: number;
  on_time_deliveries: number;
  delayed_deliveries: number;
  quality_rating: number;
  response_time: number;
  issue_resolution_time: number;
  order_completion_rate: number;
  service_rating: number;
  performance_score: number;
  created_at?: string;
  updated_at?: string;
}

export interface VendorPerformanceCreateDto {
  vendor_id: number;
  on_time_deliveries: number;
  delayed_deliveries: number;
  quality_rating: number;
  response_time: number;
  issue_resolution_time: number;
  order_completion_rate: number;
  service_rating: number;
}

export interface VendorPerformanceUpdateDto {
  on_time_deliveries?: number;
  delayed_deliveries?: number;
  quality_rating?: number;
  response_time?: number;
  issue_resolution_time?: number;
  order_completion_rate?: number;
  service_rating?: number;
}