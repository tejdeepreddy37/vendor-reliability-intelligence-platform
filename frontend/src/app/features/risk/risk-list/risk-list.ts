import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { RiskService } from '../../../core/services/risk.service';
import { VendorService } from '../../../core/services/vendor';
import { Risk } from '../../../core/models/risk.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-risk-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './risk-list.html',
  styleUrl: './risk-list.scss'
})
export class RiskList implements OnInit {
  private riskService = inject(RiskService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  risks: Risk[] = [];
  vendors: Vendor[] = [];
  vendorMap = new Map<number, Vendor>();

  loading = true;
  errorMessage = '';
  actionLoading = false;

  searchTerm = '';
  severityFilter = 'all';
  statusFilter = 'all';

  selectedRisk: Risk | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      risks: this.riskService.getAllRisks(),
      vendors: this.vendorService.getAllVendors()
    }).subscribe({
      next: ({ risks, vendors }) => {
        this.risks = Array.isArray(risks) ? risks : [];
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
        console.error('Failed to load risk registry:', err);
        this.errorMessage = 'Could not load vendor risk records from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredRisks(): Risk[] {
    return this.risks.filter((r) => {
      const vendorName = this.getVendorName(r).toLowerCase();
      const type = (r.risk_type || '').toLowerCase();
      const sev = (r.severity || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const status = (r.status || 'Open').toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        vendorName.includes(term) ||
        type.includes(term) ||
        sev.includes(term) ||
        desc.includes(term) ||
        status.includes(term) ||
        String(r.id).includes(term);

      const matchesSeverity =
        this.severityFilter === 'all' || sev === this.severityFilter.toLowerCase();

      const matchesStatus =
        this.statusFilter === 'all' || status === this.statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }

  get criticalHighCount(): number {
    return this.risks.filter((r) => {
      const s = (r.severity || '').toLowerCase();
      return s === 'critical' || s === 'high';
    }).length;
  }

  get openCount(): number {
    return this.risks.filter((r) => (r.status || 'Open').toLowerCase() === 'open').length;
  }

  get underReviewCount(): number {
    return this.risks.filter((r) => (r.status || '').toLowerCase() === 'under review').length;
  }

  get mitigatedClosedCount(): number {
    return this.risks.filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'mitigated' || s === 'closed';
    }).length;
  }

  getVendor(vendorId: number): Vendor | undefined {
    return this.vendorMap.get(vendorId);
  }

  getVendorName(r: Risk): string {
    const v = this.vendorMap.get(r.vendor_id);
    return v?.company_name || `Vendor #${r.vendor_id}`;
  }

  getSeverityClass(sev: string | undefined): string {
    const s = (sev || 'Low').toLowerCase();
    if (s === 'critical') return 'sev-critical';
    if (s === 'high') return 'sev-high';
    if (s === 'medium') return 'sev-medium';
    return 'sev-low';
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || 'Open').toLowerCase();
    if (s === 'open') return 'status-open';
    if (s === 'under review') return 'status-review';
    if (s === 'mitigated') return 'status-mitigated';
    if (s === 'closed') return 'status-closed';
    return 'status-neutral';
  }

  navigateToAdd(): void {
    this.router.navigate(['/risk/add']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/risk']);
  }

  editRisk(id: number): void {
    this.router.navigate(['/risk/edit', id]);
  }

  viewDetails(risk: Risk): void {
    this.selectedRisk = risk;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedRisk = null;
    this.cdr.markForCheck();
  }

  updateStatus(r: Risk, newStatus: string): void {
    if (r.id == null) return;
    this.actionLoading = true;

    this.riskService.updateRisk(r.id, { status: newStatus }).subscribe({
      next: (updated) => {
        r.status = updated.status;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating risk status', err);
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteRisk(event: Event, id: number): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this risk record? This action cannot be undone.')) {
      return;
    }

    this.riskService.deleteRisk(id).subscribe({
      next: () => {
        if (this.selectedRisk?.id === id) {
          this.selectedRisk = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting risk record:', err);
        alert('Failed to delete risk record.');
        this.cdr.markForCheck();
      }
    });
  }
}