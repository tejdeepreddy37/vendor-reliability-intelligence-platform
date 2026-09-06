export interface Communication {
  id?: number;
  vendor_id: number;
  subject: string;
  message: string;
  communication_type: string;
  status?: string;
  communication_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunicationCreateDto {
  vendor_id: number;
  subject: string;
  message: string;
  communication_type: string;
  status?: string;
  communication_date?: string;
}

export interface CommunicationUpdateDto {
  vendor_id?: number;
  subject?: string;
  message?: string;
  communication_type?: string;
  status?: string;
  communication_date?: string;
}