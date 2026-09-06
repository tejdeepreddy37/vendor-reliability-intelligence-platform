import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CommunicationService } from '../../../core/services/communication';
import { VendorService } from '../../../core/services/vendor';
import { Communication } from '../../../core/models/communication.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-communication-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './communication-list.html',
  styleUrls: ['./communication-list.scss']
})
export class CommunicationList implements OnInit {
  private communicationService = inject(CommunicationService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  communications: Communication[] = [];
  vendors: Vendor[] = [];
  vendorMap = new Map<number, Vendor>();

  loading = true;
  errorMessage = '';
  actionLoading = false;

  searchTerm = '';
  typeFilter = 'all';
  statusFilter = 'all';

  selectedCommunication: Communication | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      communications: this.communicationService.getAllCommunications(),
      vendors: this.vendorService.getAllVendors()
    }).subscribe({
      next: ({ communications, vendors }) => {
        this.communications = Array.isArray(communications) ? communications : [];
        this.vendors = Array.isArray(vendors) ? vendors : [];

        this.vendorMap.clear();
        for (const v of this.vendors) {
          if (v.id != null) {
            this.vendorMap.set(v.id, v);
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load communications:', err);
        this.errorMessage = 'Could not load communication records from database. Please retry.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredCommunications(): Communication[] {
    return this.communications.filter((c) => {
      const vendorName = this.getVendorName(c).toLowerCase();
      const subject = (c.subject || '').toLowerCase();
      const message = (c.message || '').toLowerCase();
      const type = (c.communication_type || '').toLowerCase();
      const status = (c.status || 'Sent').toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        subject.includes(term) ||
        message.includes(term) ||
        vendorName.includes(term) ||
        type.includes(term) ||
        status.includes(term) ||
        String(c.id).includes(term);

      const matchesType =
        this.typeFilter === 'all' || type === this.typeFilter.toLowerCase();

      const matchesStatus =
        this.statusFilter === 'all' || status === this.statusFilter.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }

  get emailCount(): number {
    return this.communications.filter(
      (c) => (c.communication_type || '').toLowerCase() === 'email'
    ).length;
  }

  get callMeetingCount(): number {
    return this.communications.filter((c) => {
      const t = (c.communication_type || '').toLowerCase();
      return t === 'call' || t === 'meeting';
    }).length;
  }

  get noticeInquiryCount(): number {
    return this.communications.filter((c) => {
      const t = (c.communication_type || '').toLowerCase();
      return t === 'notice' || t === 'inquiry';
    }).length;
  }

  getVendor(vendorId: number): Vendor | undefined {
    return this.vendorMap.get(vendorId);
  }

  getVendorName(c: Communication): string {
    const v = this.vendorMap.get(c.vendor_id);
    return v?.company_name || v?.contact_person || `Vendor #${c.vendor_id}`;
  }

  getTypeIcon(type: string | undefined): string {
    const t = (type || '').toLowerCase();
    if (t === 'email') return '✉️';
    if (t === 'call') return '📞';
    if (t === 'meeting') return '👥';
    if (t === 'notice') return '📢';
    if (t === 'inquiry') return '❓';
    return '📝';
  }

  getTypeClass(type: string | undefined): string {
    const t = (type || '').toLowerCase();
    if (t === 'email') return 'type-email';
    if (t === 'call') return 'type-call';
    if (t === 'meeting') return 'type-meeting';
    if (t === 'notice') return 'type-notice';
    if (t === 'inquiry') return 'type-inquiry';
    return 'type-default';
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || 'Sent').toLowerCase();
    if (s === 'delivered' || s === 'sent' || s === 'completed') return 'status-sent';
    if (s === 'pending' || s === 'in progress') return 'status-pending';
    if (s === 'draft') return 'status-draft';
    if (s === 'archived' || s === 'closed') return 'status-archived';
    return 'status-neutral';
  }

  navigateToCreate(): void {
    this.router.navigate(['/communications/add']);
  }

  editCommunication(id: number): void {
    this.router.navigate(['/communications/edit', id]);
  }

  viewDetails(c: Communication): void {
    this.selectedCommunication = c;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedCommunication = null;
    this.cdr.markForCheck();
  }

  updateStatus(c: Communication, newStatus: string): void {
    if (c.id == null) return;
    this.actionLoading = true;

    this.communicationService.updateCommunication(c.id, { status: newStatus }).subscribe({
      next: (updated) => {
        c.status = updated.status;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating status', err);
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteCommunication(event: Event, id: number): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this communication record? This action cannot be undone.')) {
      return;
    }

    this.communicationService.deleteCommunication(id).subscribe({
      next: () => {
        if (this.selectedCommunication?.id === id) {
          this.selectedCommunication = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting communication:', err);
        alert('Failed to delete communication record.');
        this.cdr.markForCheck();
      }
    });
  }
}