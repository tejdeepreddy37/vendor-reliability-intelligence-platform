import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/notifications';

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getNotificationById(id: number): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`);
  }

  createNotification(notification: Notification): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  updateNotification(id: number, notification: Partial<Notification>): Observable<Notification> {
    return this.http.put<Notification>(
      `${this.apiUrl}/${id}`,
      notification
    );
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/read-all`, {});
  }

  syncAlerts(): Observable<Notification[]> {
    return this.http.post<Notification[]>(`${this.apiUrl}/sync-alerts`, {});
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}