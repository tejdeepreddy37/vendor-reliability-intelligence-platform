import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Procurement } from '../../../core/models/procurement.model';
import { Vendor } from '../../../core/models/vendor.model';
import { ProcurementService } from '../../../core/services/procurement';
import { VendorService } from '../../../core/services/vendor';

@Component({
  selector: 'app-procurement-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procurement-list.html',
  styleUrls: ['./procurement-list.scss']
})
export class ProcurementList implements OnInit {
  private procurementService = inject(ProcurementService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  procurements: Procurement[] = [];
  vendors: Vendor[] = [];
  vendorMap = new Map<number, Vendor>();

  loading = true;
  actionLoading = false;
  errorMessage = '';

  searchTerm = '';
  statusFilter = 'all';

  selectedProcurement: Procurement | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      procurements: this.procurementService.getAllProcurements(),
      vendors: this.vendorService.getAllVendors()
    }).subscribe({
      next: ({ procurements, vendors }) => {
        this.procurements = Array.isArray(procurements) ? procurements : [];
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
        console.error('Failed to load procurement records:', err);
        this.errorMessage = 'Could not load procurement requests from database. Please retry.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredProcurements(): Procurement[] {
    return this.procurements.filter((p) => {
      const vendorName = this.getVendorName(p.vendor_id).toLowerCase();
      const title = (p.title || '').toLowerCase();
      const num = (p.request_number || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const reqBy = (p.requested_by || '').toLowerCase();
      const appBy = (p.approved_by || '').toLowerCase();
      const status = (p.status || 'Pending').toLowerCase();
      const inv = (p.invoice_number || '').toLowerCase();
      const remarks = (p.remarks || '').toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        num.includes(term) ||
        title.includes(term) ||
        vendorName.includes(term) ||
        desc.includes(term) ||
        reqBy.includes(term) ||
        appBy.includes(term) ||
        status.includes(term) ||
        inv.includes(term) ||
        remarks.includes(term) ||
        String(p.total_amount).includes(term);

      let matchesFilter = true;
      if (this.statusFilter !== 'all') {
        matchesFilter = status === this.statusFilter.toLowerCase();
      }

      return matchesSearch && matchesFilter;
    });
  }

  get totalRequests(): number {
    return this.procurements.length;
  }

  get pendingCount(): number {
    return this.procurements.filter(
      (p) => (p.status || 'Pending').toLowerCase() === 'pending'
    ).length;
  }

  get approvedCount(): number {
    return this.procurements.filter(
      (p) => (p.status || '').toLowerCase() === 'approved'
    ).length;
  }

  get totalRequestValue(): number {
    return this.procurements.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  }

  getVendor(vendorId: number): Vendor | undefined {
    return this.vendorMap.get(vendorId);
  }

  getVendorName(vendorId: number): string {
    const v = this.vendorMap.get(vendorId);
    return v?.company_name || v?.contact_person || `Supplier #${vendorId}`;
  }

  getVendorCategory(vendorId: number): string {
    const v = this.vendorMap.get(vendorId);
    return v?.category || 'General Supply';
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'PR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'status-approved';
    if (s === 'pending' || s === 'under_review') return 'status-pending';
    if (s === 'rejected' || s === 'cancelled') return 'status-rejected';
    if (s === 'in progress' || s === 'in_progress' || s === 'ordered') return 'status-progress';
    return 'status-neutral';
  }

  navigateToCreate(): void {
    this.router.navigate(['/procurement/add']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/procurement/edit', id]);
  }

  viewDetails(procurement: Procurement): void {
    this.selectedProcurement = procurement;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedProcurement = null;
    this.cdr.markForCheck();
  }

  navigateToFullDetails(id: number): void {
    this.router.navigate(['/procurement/details', id]);
  }

  approve(procurement: Procurement, approverName: string = 'Procurement Officer'): void {
    if (procurement.id == null) return;
    this.actionLoading = true;

    this.procurementService.approveProcurement(procurement.id, approverName).subscribe({
      next: (updated) => {
        procurement.status = updated.status;
        procurement.approved_by = updated.approved_by;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to approve procurement request:', err);
        // Fallback update if approve route had query error
        this.procurementService.updateProcurement(procurement.id!, {
          status: 'Approved',
          approved_by: approverName
        }).subscribe({
          next: (fallback) => {
            procurement.status = fallback.status;
            procurement.approved_by = fallback.approved_by;
            this.actionLoading = false;
            this.cdr.markForCheck();
          },
          error: (fErr) => {
            console.error('Fallback approval failed:', fErr);
            alert('Failed to approve procurement request.');
            this.actionLoading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  reject(procurement: Procurement, rejectorName: string = 'Procurement Officer'): void {
    if (procurement.id == null) return;
    this.actionLoading = true;

    this.procurementService.rejectProcurement(procurement.id, rejectorName).subscribe({
      next: (updated) => {
        procurement.status = updated.status;
        procurement.approved_by = updated.approved_by;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to reject procurement request:', err);
        // Fallback update
        this.procurementService.updateProcurement(procurement.id!, {
          status: 'Rejected',
          approved_by: rejectorName
        }).subscribe({
          next: (fallback) => {
            procurement.status = fallback.status;
            procurement.approved_by = fallback.approved_by;
            this.actionLoading = false;
            this.cdr.markForCheck();
          },
          error: (fErr) => {
            console.error('Fallback rejection failed:', fErr);
            alert('Failed to reject procurement request.');
            this.actionLoading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  delete(event: Event, id: number): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this procurement requisition? This action cannot be undone.')) {
      return;
    }

    this.procurementService.deleteProcurement(id).subscribe({
      next: () => {
        if (this.selectedProcurement?.id === id) {
          this.selectedProcurement = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting procurement request:', err);
        alert('Failed to delete procurement request.');
        this.cdr.markForCheck();
      }
    });
  }
}