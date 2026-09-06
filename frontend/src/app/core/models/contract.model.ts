export interface Contract {
  id?: number;
  contract_number: string;
  vendor_id: number;
  contract_name?: string;
  contract_title?: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  status?: string;
  currency?: string;
  description?: string | null;
  terms_conditions?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContractCreateDto {
  contract_number: string;
  vendor_id: number;
  contract_name: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  currency?: string;
  description?: string | null;
}

export interface ContractUpdateDto {
  contract_name?: string;
  end_date?: string;
  contract_value?: number;
  currency?: string;
  status?: string;
  description?: string | null;
}