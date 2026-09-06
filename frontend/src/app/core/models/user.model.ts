export interface User {
  id: number | string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  provider?: string;
  google_id?: string;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
}