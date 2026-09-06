import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Notification } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList implements OnInit {
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  notifications: Notification[] = [];
  loading = true;
  syncing = false;
  errorMessage = '';

  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';

  selectedNotification: Notification | null = null;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.notificationService.getAllNotifications().subscribe({
      next: (data) => {
        this.notifications = Array.isArray(data) ? data : [];
        this.loading = false;
        this.checkRouteForDetail();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.errorMessage = 'Failed to load notifications from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  syncAlerts(): void {
    this.syncing = true;
    this.errorMessage = '';

    this.notificationService.syncAlerts().subscribe({
      next: (updatedList) => {
        this.notifications = Array.isArray(updatedList) ? updatedList : [];
        this.syncing = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to sync alerts:', err);
        this.errorMessage = 'Failed to sync procurement alerts from database.';
        this.syncing = false;
        this.cdr.markForCheck();
      }
    });
  }

  private checkRouteForDetail(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const targetId = Number(idParam);
      const matched = this.notifications.find((n) => n.id === targetId);
      if (matched) {
        this.openDetail(matched);
      }
    }
  }

  get filteredNotifications(): Notification[] {
    return this.notifications.filter((n) => {
      const term = this.searchTerm.trim().toLowerCase();
      const title = (n.title || '').toLowerCase();
      const msg = (n.message || '').toLowerCase();
      const type = (n.notification_type || '').toLowerCase();
      const recipient = (n.recipient || '').toLowerCase();

      const matchesSearch =
        !term ||
        title.includes(term) ||
        msg.includes(term) ||
        type.includes(term) ||
        recipient.includes(term) ||
        String(n.id).includes(term);

      let matchesStatus = true;
      if (this.statusFilter === 'unread') {
        matchesStatus = n.status !== 'Read';
      } else if (this.statusFilter === 'read') {
        matchesStatus = n.status === 'Read';
      }

      let matchesType = true;
      if (this.typeFilter !== 'all') {
        matchesType = (n.notification_type || '').toLowerCase() === this.typeFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  get totalCount(): number {
    return this.notifications.length;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => n.status !== 'Read').length;
  }

  get contractAlertsCount(): number {
    return this.notifications.filter((n) => (n.notification_type || '').toLowerCase().includes('contract')).length;
  }

  get deliveryAlertsCount(): number {
    return this.notifications.filter((n) => (n.notification_type || '').toLowerCase().includes('delivery')).length;
  }

  get complianceAlertsCount(): number {
    return this.notifications.filter((n) => (n.notification_type || '').toLowerCase().includes('compliance')).length;
  }

  getTypeBadgeClass(type: string | undefined): string {
    const t = (type || '').toLowerCase();
    if (t.includes('delivery')) return 'badge-delay';
    if (t.includes('contract')) return 'badge-contract';
    if (t.includes('approval') || t.includes('vendor')) return 'badge-vendor';
    if (t.includes('compliance') || t.includes('risk')) return 'badge-compliance';
    return 'badge-procurement';
  }

  markAsRead(event: Event, n: Notification): void {
    event.stopPropagation();
    if (!n.id || n.status === 'Read') return;

    this.notificationService.markAsRead(n.id).subscribe({
      next: (updated) => {
        n.status = 'Read';
        if (this.selectedNotification && this.selectedNotification.id === n.id) {
          this.selectedNotification.status = 'Read';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to mark notification as read:', err);
      }
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        for (const n of this.notifications) {
          n.status = 'Read';
        }
        if (this.selectedNotification) {
          this.selectedNotification.status = 'Read';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to mark all notifications as read:', err);
      }
    });
  }

  deleteNotification(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Dismiss and delete this notification record?')) return;

    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n.id !== id);
        if (this.selectedNotification?.id === id) {
          this.selectedNotification = null;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to delete notification:', err);
        alert('Could not delete notification record.');
      }
    });
  }

  openDetail(n: Notification): void {
    this.selectedNotification = n;
    if (n.status !== 'Read' && n.id) {
      this.notificationService.markAsRead(n.id).subscribe({
        next: () => {
          n.status = 'Read';
          this.cdr.markForCheck();
        }
      });
    }
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selectedNotification = null;
    this.cdr.markForCheck();
  }

  navigateToAdd(): void {
    this.router.navigate(['/notifications/add']);
  }

  navigateToEntity(type: string | undefined): void {
    const t = (type || '').toLowerCase();
    if (t.includes('contract')) {
      this.router.navigate(['/contracts']);
    } else if (t.includes('delivery') || t.includes('procurement')) {
      this.router.navigate(['/purchase-orders']);
    } else if (t.includes('vendor')) {
      this.router.navigate(['/vendors']);
    } else if (t.includes('compliance') || t.includes('risk')) {
      this.router.navigate(['/risk']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}