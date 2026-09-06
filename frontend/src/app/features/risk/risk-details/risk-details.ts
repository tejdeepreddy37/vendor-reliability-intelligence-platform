import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';

import { RiskService } from '../../../core/services/risk.service';
import { VendorService } from '../../../core/services/vendor';
import { ReliabilityService } from '../../../core/services/reliability.service';
import { Risk } from '../../../core/models/risk.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Reliability } from '../../../core/models/reliability.model';

@Component({
  selector: 'app-risk-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './risk-details.html',
  styleUrl: './risk-details.scss'
})
export class RiskDetails implements OnInit {
  private riskService = inject(RiskService);
  private vendorService = inject(VendorService);
  private reliabilityService = inject(ReliabilityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  vendorId: number | null = null;
  targetRiskId: number | null = null;

  vendor: Vendor | null = null;
  reliability: Reliability | null = null;
  risks: Risk[] = [];
  selectedRisk: Risk | null = null;

  loading = true;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.resolveAndLoad(Number(idParam));
      } else {
        this.errorMessage = 'No supplier or risk identifier provided.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private resolveAndLoad(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    // Step 1: Check if this ID is a Vendor directly
    this.vendorService.getVendorById(id).pipe(
      catchError(() => of(null))
    ).subscribe((directVendor) => {
      if (directVendor && directVendor.id) {
        // ID represents a Vendor
        this.vendorId = directVendor.id;
        this.vendor = directVendor;
        this.loadVendorDetails(this.vendorId);
      } else {
        // Step 2: Try checking if ID represents a Risk record
        this.riskService.getRiskById(id).pipe(
          catchError(() => of(null))
        ).subscribe((riskRecord) => {
          if (riskRecord && riskRecord.vendor_id) {
            this.targetRiskId = riskRecord.id ?? null;
            this.selectedRisk = riskRecord;
            this.vendorId = riskRecord.vendor_id;

            this.vendorService.getVendorById(this.vendorId).subscribe({
              next: (v) => {
                this.vendor = v;
                this.loadVendorDetails(this.vendorId!);
              },
              error: (err) => {
                console.error('Error loading associated vendor:', err);
                this.errorMessage = 'Could not load associated vendor for this risk record.';
                this.loading = false;
                this.cdr.markForCheck();
              }
            });
          } else {
            this.errorMessage = `Entity #${id} not found in database.`;
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  private loadVendorDetails(vendorId: number): void {
    forkJoin({
      reliability: this.reliabilityService.getVendorReliability(vendorId).pipe(
        catchError((err) => {
          console.warn('Reliability fetch error:', err);
          return of(null);
        })
      ),
      risks: this.riskService.getRisksByVendor(vendorId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ reliability, risks }) => {
        this.reliability = reliability;
        this.risks = Array.isArray(risks) ? risks : [];

        if (this.targetRiskId && !this.selectedRisk) {
          this.selectedRisk = this.risks.find((r) => r.id === this.targetRiskId) || null;
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reliability intelligence:', err);
        this.errorMessage = 'Failed to load reliability intelligence from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getRiskLevelClass(level: string | undefined): string {
    const l = (level || 'LOW').toUpperCase();
    if (l === 'HIGH' || l === 'CRITICAL') return 'level-high';
    if (l === 'MEDIUM' || l === 'MODERATE') return 'level-medium';
    return 'level-low';
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

  getScoreColorClass(score: number | undefined): string {
    if (score == null) return 'score-neutral';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-poor';
  }

  updateRiskStatus(r: Risk, newStatus: string): void {
    if (r.id == null) return;
    this.actionLoading = true;

    this.riskService.updateRisk(r.id, { status: newStatus }).subscribe({
      next: (updated) => {
        r.status = updated.status;
        this.actionLoading = false;
        // Refresh reliability scores from backend
        if (this.vendorId) {
          this.reliabilityService.getVendorReliability(this.vendorId).subscribe((rel) => {
            this.reliability = rel;
            this.cdr.markForCheck();
          });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating risk status:', err);
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteRisk(r: Risk): void {
    if (r.id == null) return;
    if (!confirm('Are you sure you want to delete this risk record?')) return;

    this.riskService.deleteRisk(r.id).subscribe({
      next: () => {
        this.risks = this.risks.filter((item) => item.id !== r.id);
        if (this.selectedRisk?.id === r.id) {
          this.selectedRisk = null;
        }
        // Refresh reliability
        if (this.vendorId) {
          this.reliabilityService.getVendorReliability(this.vendorId).subscribe((rel) => {
            this.reliability = rel;
            this.cdr.markForCheck();
          });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error deleting risk:', err);
        alert('Failed to delete risk record.');
        this.cdr.markForCheck();
      }
    });
  }

  logRiskForVendor(): void {
    if (this.vendorId) {
      this.router.navigate(['/risk/add', this.vendorId]);
    } else {
      this.router.navigate(['/risk/add']);
    }
  }

  editRisk(id: number): void {
    this.router.navigate(['/risk/edit', id]);
  }

  backToDashboard(): void {
    this.router.navigate(['/risk']);
  }
}