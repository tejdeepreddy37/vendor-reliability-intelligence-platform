import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';

import { VendorService } from '../../../core/services/vendor';
import { RiskService } from '../../../core/services/risk.service';
import { ReliabilityService } from '../../../core/services/reliability.service';
import { Vendor } from '../../../core/models/vendor.model';
import { Risk } from '../../../core/models/risk.model';
import { Reliability } from '../../../core/models/reliability.model';

export interface VendorRiskSummary {
  vendor: Vendor;
  reliability?: Reliability;
  risks: Risk[];
}

@Component({
  selector: 'app-risk-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './risk-dashboard.html',
  styleUrl: './risk-dashboard.scss'
})
export class RiskDashboard implements OnInit {
  private vendorService = inject(VendorService);
  private riskService = inject(RiskService);
  private reliabilityService = inject(ReliabilityService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  vendors: Vendor[] = [];
  risks: Risk[] = [];
  vendorSummaries: VendorRiskSummary[] = [];

  loading = true;
  errorMessage = '';

  searchTerm = '';
  levelFilter = 'all';

  selectedSummary: VendorRiskSummary | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      vendors: this.vendorService.getAllVendors().pipe(catchError(() => of([]))),
      risks: this.riskService.getAllRisks().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ vendors, risks }) => {
        this.vendors = Array.isArray(vendors) ? vendors : [];
        this.risks = Array.isArray(risks) ? risks : [];

        if (this.vendors.length === 0) {
          this.vendorSummaries = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        // Fetch reliability for all vendors concurrently
        const reliabilityObservables = this.vendors.map((v) =>
          this.reliabilityService.getVendorReliability(v.id!).pipe(
            catchError((err) => {
              console.warn(`Could not load reliability for vendor ${v.id}:`, err);
              return of(null);
            })
          )
        );

        forkJoin(reliabilityObservables).subscribe({
          next: (reliabilities) => {
            this.vendorSummaries = this.vendors.map((v, i) => {
              const rel = reliabilities[i] || undefined;
              const vendorRisks = this.risks.filter((r) => r.vendor_id === v.id);
              return {
                vendor: v,
                reliability: rel,
                risks: vendorRisks
              };
            });

            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error fetching reliabilities:', err);
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load risk dashboard data:', err);
        this.errorMessage = 'Failed to load risk and reliability intelligence from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredSummaries(): VendorRiskSummary[] {
    return this.vendorSummaries.filter((s) => {
      const name = (s.vendor.company_name || '').toLowerCase();
      const cat = (s.vendor.category || '').toLowerCase();
      const rawLevel = (s.reliability?.risk_level || 'LOW').toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        name.includes(term) ||
        cat.includes(term) ||
        String(s.vendor.id).includes(term) ||
        rawLevel.includes(term);

      let matchesLevel = true;
      if (this.levelFilter === 'high') {
        matchesLevel = rawLevel === 'high' || rawLevel === 'critical';
      } else if (this.levelFilter === 'medium') {
        matchesLevel = rawLevel === 'medium' || rawLevel === 'moderate';
      } else if (this.levelFilter === 'low') {
        matchesLevel = rawLevel === 'low';
      }

      return matchesSearch && matchesLevel;
    });
  }

  get averageReliability(): number {
    const scored = this.vendorSummaries.filter(
      (s) => s.reliability?.overall_reliability_score != null
    );
    if (scored.length === 0) return 0;
    const total = scored.reduce(
      (sum, s) => sum + (s.reliability?.overall_reliability_score || 0),
      0
    );
    return Math.round((total / scored.length) * 10) / 10;
  }

  get highRiskCount(): number {
    return this.vendorSummaries.filter((s) => {
      const lvl = (s.reliability?.risk_level || '').toUpperCase();
      return lvl === 'HIGH' || lvl === 'CRITICAL';
    }).length;
  }

  get mediumRiskCount(): number {
    return this.vendorSummaries.filter((s) => {
      const lvl = (s.reliability?.risk_level || '').toUpperCase();
      return lvl === 'MEDIUM' || lvl === 'MODERATE';
    }).length;
  }

  get lowRiskCount(): number {
    return this.vendorSummaries.filter((s) => {
      const lvl = (s.reliability?.risk_level || 'LOW').toUpperCase();
      return lvl === 'LOW';
    }).length;
  }

  get totalOpenRisks(): number {
    return this.risks.filter(
      (r) => (r.status || 'Open').toLowerCase() === 'open'
    ).length;
  }

  getRiskLevelClass(level: string | undefined): string {
    const l = (level || 'LOW').toUpperCase();
    if (l === 'HIGH' || l === 'CRITICAL') return 'level-high';
    if (l === 'MEDIUM' || l === 'MODERATE') return 'level-medium';
    return 'level-low';
  }

  getScoreColorClass(score: number | undefined): string {
    if (score == null) return 'score-neutral';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-poor';
  }

  getSeverityClass(sev: string | undefined): string {
    const s = (sev || 'Low').toLowerCase();
    if (s === 'critical') return 'sev-critical';
    if (s === 'high') return 'sev-high';
    if (s === 'medium') return 'sev-medium';
    return 'sev-low';
  }

  viewVendorIntelligence(summary: VendorRiskSummary): void {
    if (summary.vendor.id) {
      this.router.navigate(['/risk/details', summary.vendor.id]);
    }
  }

  openQuickView(summary: VendorRiskSummary): void {
    this.selectedSummary = summary;
    this.cdr.markForCheck();
  }

  closeQuickView(): void {
    this.selectedSummary = null;
    this.cdr.markForCheck();
  }

  navigateToAddRisk(vendorId?: number): void {
    if (vendorId) {
      this.router.navigate(['/risk/add', vendorId]);
    } else {
      this.router.navigate(['/risk/add']);
    }
  }

  navigateToRiskList(): void {
    this.router.navigate(['/risk/list']);
  }
}