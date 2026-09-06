export interface Notification {
  id?: number;
  title: string;
  message: string;
  recipient: string;
  notification_type: string;
  status?: string;
  is_read?: boolean;
  created_at?: string;
}