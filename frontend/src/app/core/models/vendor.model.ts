export interface Vendor {
  id?: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  status?: string;
  is_active?: boolean;
}