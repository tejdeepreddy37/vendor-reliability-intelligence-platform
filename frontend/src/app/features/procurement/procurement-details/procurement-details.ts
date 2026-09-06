import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ProcurementService } from '../../../core/services/procurement';
import { VendorService } from '../../../core/services/vendor';
import { Procurement } from '../../../core/models/procurement.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-procurement-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './procurement-details.html',
  styleUrls: ['./procurement-details.scss']
})
export class ProcurementDetails implements OnInit {
  private procurementService = inject(ProcurementService);
  private vendorService = inject(VendorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  procurement: Procurement | null = null;
  vendor: Vendor | null = null;

  loading = true;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadProcurement(Number(idParam));
    } else {
      this.errorMessage = 'No procurement request ID specified.';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  loadProcurement(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.procurementService.getProcurementById(id).subscribe({
      next: (data) => {
        this.procurement = data;
        if (data.vendor_id) {
          this.loadVendor(data.vendor_id);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching procurement details:', err);
        this.errorMessage = 'Could not load procurement request details from database.';
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

  getStatusClass(status: string | undefined): string {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'status-approved';
    if (s === 'pending' || s === 'under_review') return 'status-pending';
    if (s === 'rejected' || s === 'cancelled') return 'status-rejected';
    if (s === 'in progress' || s === 'in_progress' || s === 'ordered') return 'status-progress';
    return 'status-neutral';
  }

  approve(approverName: string = 'Procurement Officer'): void {
    if (!this.procurement?.id) return;
    this.actionLoading = true;

    this.procurementService.approveProcurement(this.procurement.id, approverName).subscribe({
      next: (updated) => {
        if (this.procurement) {
          this.procurement.status = updated.status;
          this.procurement.approved_by = updated.approved_by;
        }
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Approve failed, trying direct update:', err);
        this.procurementService.updateProcurement(this.procurement!.id!, {
          status: 'Approved',
          approved_by: approverName
        }).subscribe({
          next: (fb) => {
            if (this.procurement) {
              this.procurement.status = fb.status;
              this.procurement.approved_by = fb.approved_by;
            }
            this.actionLoading = false;
            this.cdr.markForCheck();
          },
          error: (fErr) => {
            console.error('Error updating status', fErr);
            alert('Failed to approve procurement request.');
            this.actionLoading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  reject(rejectorName: string = 'Procurement Officer'): void {
    if (!this.procurement?.id) return;
    this.actionLoading = true;

    this.procurementService.rejectProcurement(this.procurement.id, rejectorName).subscribe({
      next: (updated) => {
        if (this.procurement) {
          this.procurement.status = updated.status;
          this.procurement.approved_by = updated.approved_by;
        }
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Reject failed, trying direct update:', err);
        this.procurementService.updateProcurement(this.procurement!.id!, {
          status: 'Rejected',
          approved_by: rejectorName
        }).subscribe({
          next: (fb) => {
            if (this.procurement) {
              this.procurement.status = fb.status;
              this.procurement.approved_by = fb.approved_by;
            }
            this.actionLoading = false;
            this.cdr.markForCheck();
          },
          error: (fErr) => {
            console.error('Error rejecting status', fErr);
            alert('Failed to reject procurement request.');
            this.actionLoading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  editProcurement(): void {
    if (this.procurement?.id) {
      this.router.navigate(['/procurement/edit', this.procurement.id]);
    }
  }

  deleteProcurement(): void {
    if (!this.procurement?.id) return;

    if (!confirm(`Are you sure you want to delete procurement ${this.procurement.request_number}? This action cannot be undone.`)) {
      return;
    }

    this.procurementService.deleteProcurement(this.procurement.id).subscribe({
      next: () => {
        this.router.navigate(['/procurement']);
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Failed to delete procurement.');
        this.cdr.markForCheck();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/procurement']);
  }
}