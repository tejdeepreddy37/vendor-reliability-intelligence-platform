export interface PurchaseOrder {
  id?: number;
  po_number: string;
  procurement_id: number;
  vendor_id: number;
  order_date: string;
  expected_delivery?: string | null;
  total_amount: number;
  status?: string;
  payment_status?: string;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePurchaseOrderDto {
  po_number: string;
  procurement_id: number;
  vendor_id: number;
  order_date: string;
  expected_delivery?: string | null;
  total_amount: number;
  remarks?: string | null;
}

export interface UpdatePurchaseOrderDto {
  po_number?: string;
  procurement_id?: number;
  vendor_id?: number;
  order_date?: string;
  expected_delivery?: string | null;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  remarks?: string | null;
}