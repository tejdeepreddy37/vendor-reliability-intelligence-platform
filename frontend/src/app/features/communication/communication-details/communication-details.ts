import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { CommunicationService } from '../../../core/services/communication';
import { VendorService } from '../../../core/services/vendor';
import { Communication } from '../../../core/models/communication.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-communication-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './communication-details.html',
  styleUrls: ['./communication-details.scss']
})
export class CommunicationDetails implements OnInit {
  private communicationService = inject(CommunicationService);
  private vendorService = inject(VendorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  communication: Communication | null = null;
  vendor: Vendor | null = null;

  loading = true;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadCommunication(Number(idParam));
    } else {
      this.errorMessage = 'No communication ID specified.';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  loadCommunication(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.communicationService.getCommunicationById(id).subscribe({
      next: (comm) => {
        this.communication = comm;
        if (comm.vendor_id) {
          this.loadVendor(comm.vendor_id);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching communication details:', err);
        this.errorMessage = 'Could not load communication details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadVendor(vendorId: number): void {
    this.vendorService.getVendorById(vendorId).subscribe({
      next: (v) => {
        this.vendor = v;
        this.cdr.markForCheck();
      },
      error: (err) => console.warn('Could not load associated vendor', err)
    });
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

  updateStatus(newStatus: string): void {
    if (!this.communication?.id) return;
    this.actionLoading = true;

    this.communicationService.updateCommunication(this.communication.id, { status: newStatus }).subscribe({
      next: (updated) => {
        if (this.communication) {
          this.communication.status = updated.status;
        }
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating status', err);
        alert('Failed to update communication status.');
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  editCommunication(): void {
    if (this.communication?.id) {
      this.router.navigate(['/communications/edit', this.communication.id]);
    }
  }

  deleteCommunication(): void {
    if (!this.communication?.id) return;

    if (!confirm(`Are you sure you want to delete communication record #${this.communication.id}? This action cannot be undone.`)) {
      return;
    }

    this.communicationService.deleteCommunication(this.communication.id).subscribe({
      next: () => {
        this.router.navigate(['/communications']);
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Failed to delete communication.');
        this.cdr.markForCheck();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/communications']);
  }
}