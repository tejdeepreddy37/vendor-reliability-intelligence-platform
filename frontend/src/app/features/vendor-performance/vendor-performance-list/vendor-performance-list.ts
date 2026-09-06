import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';

import { VendorPerformanceService } from '../../../core/services/vendor-performance.service';
import { VendorService } from '../../../core/services/vendor';
import { ReliabilityService } from '../../../core/services/reliability.service';

import { VendorPerformance } from '../../../core/models/vendor-performance.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Reliability } from '../../../core/models/reliability.model';

export interface VendorPerformanceItem {
  vendor: Vendor;
  performance?: VendorPerformance;
  reliability?: Reliability;
}

@Component({
  selector: 'app-vendor-performance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vendor-performance-list.html',
  styleUrl: './vendor-performance-list.scss'
})
export class VendorPerformanceList implements OnInit {
  private vendorPerformanceService = inject(VendorPerformanceService);
  private vendorService = inject(VendorService);
  private reliabilityService = inject(ReliabilityService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  vendors: Vendor[] = [];
  performances: VendorPerformance[] = [];
  items: VendorPerformanceItem[] = [];

  loading = true;
  errorMessage = '';

  searchTerm = '';
  tierFilter = 'all';

  selectedItem: VendorPerformanceItem | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      vendors: this.vendorService.getAllVendors().pipe(catchError(() => of([]))),
      performances: this.vendorPerformanceService.getAllVendorPerformance().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ vendors, performances }) => {
        this.vendors = Array.isArray(vendors) ? vendors : [];
        this.performances = Array.isArray(performances) ? performances : [];

        if (this.vendors.length === 0) {
          this.items = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        const perfMap = new Map<number, VendorPerformance>();
        for (const p of this.performances) {
          if (p.vendor_id != null) {
            perfMap.set(p.vendor_id, p);
          }
        }

        const evaluatedVendors = this.vendors.filter((v) => v.id != null && perfMap.has(v.id));

        if (evaluatedVendors.length === 0) {
          this.items = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        // Fetch reliability for evaluated vendors concurrently
        const reliabilityObservables = evaluatedVendors.map((v) =>
          this.reliabilityService.getVendorReliability(v.id!).pipe(
            catchError((err) => {
              console.warn(`Could not load reliability for vendor ${v.id}:`, err);
              return of(null);
            })
          )
        );

        forkJoin(reliabilityObservables).subscribe({
          next: (reliabilities) => {
            this.items = evaluatedVendors.map((v, i) => {
              return {
                vendor: v,
                performance: perfMap.get(v.id!),
                reliability: reliabilities[i] || undefined
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
        console.error('Failed to load vendor performance data:', err);
        this.errorMessage = 'Failed to load supplier performance records from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredItems(): VendorPerformanceItem[] {
    return this.items.filter((item) => {
      const name = (item.vendor.company_name || '').toLowerCase();
      const cat = (item.vendor.category || '').toLowerCase();
      const tier = this.getPerformanceTier(item.performance?.performance_score).toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        name.includes(term) ||
        cat.includes(term) ||
        String(item.vendor.id).includes(term) ||
        tier.includes(term);

      let matchesTier = true;
      if (this.tierFilter === 'top') {
        matchesTier = item.performance != null && (item.performance.performance_score ?? 0) >= 80;
      } else if (this.tierFilter === 'satisfactory') {
        matchesTier = item.performance != null && (item.performance.performance_score ?? 0) >= 60 && (item.performance.performance_score ?? 0) < 80;
      } else if (this.tierFilter === 'attention') {
        matchesTier = item.performance != null && item.performance.performance_score < 60;
      } else if (this.tierFilter === 'unscored') {
        matchesTier = item.performance == null;
      }

      return matchesSearch && matchesTier;
    });
  }

  get averagePerformanceScore(): number {
    const scored = this.items.filter((item) => item.performance?.performance_score != null);
    if (scored.length === 0) return 0;
    const total = scored.reduce((sum, item) => sum + (item.performance?.performance_score || 0), 0);
    return Math.round((total / scored.length) * 10) / 10;
  }

  get topPerformersCount(): number {
    return this.items.filter((item) => item.performance != null && (item.performance.performance_score ?? 0) >= 80).length;
  }

  get satisfactoryCount(): number {
    return this.items.filter((item) => {
      if (item.performance == null) return false;
      const score = item.performance.performance_score ?? 0;
      return score >= 60 && score < 80;
    }).length;
  }

  get attentionRequiredCount(): number {
    return this.items.filter((item) => item.performance != null && item.performance.performance_score < 60).length;
  }

  get onTimeDeliveryRate(): number {
    const scored = this.items.filter((item) => item.performance != null);
    if (scored.length === 0) return 0;
    let totalOnTime = 0;
    let totalAll = 0;
    for (const item of scored) {
      totalOnTime += item.performance!.on_time_deliveries || 0;
      totalAll += (item.performance!.on_time_deliveries || 0) + (item.performance!.delayed_deliveries || 0);
    }
    if (totalAll === 0) return 0;
    return Math.round((totalOnTime / totalAll) * 1000) / 10;
  }

  getPerformanceTier(score: number | undefined): string {
    if (score == null) return 'Pending';
    if (score >= 90) return 'Top Tier';
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Satisfactory';
    return 'Action Needed';
  }

  getScoreColorClass(score: number | undefined): string {
    if (score == null) return 'score-neutral';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-poor';
  }

  openOverview(item: VendorPerformanceItem): void {
    this.selectedItem = item;
    this.cdr.markForCheck();
  }

  closeOverview(): void {
    this.selectedItem = null;
    this.cdr.markForCheck();
  }

  viewDetails(item: VendorPerformanceItem): void {
    if (item.vendor.id) {
      this.router.navigate(['/vendor-performance/details', item.vendor.id]);
    }
  }

  navigateToAdd(vendorId?: number): void {
    if (vendorId) {
      this.router.navigate(['/vendor-performance/add', vendorId]);
    } else {
      this.router.navigate(['/vendor-performance/add']);
    }
  }

  editPerformance(id: number): void {
    this.router.navigate(['/vendor-performance/edit', id]);
  }

  deletePerformance(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this performance record?')) return;

    this.vendorPerformanceService.deleteVendorPerformance(id).subscribe({
      next: () => {
        if (this.selectedItem?.performance?.id === id) {
          this.selectedItem = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting performance record:', err);
        alert('Failed to delete performance record.');
        this.cdr.markForCheck();
      }
    });
  }
}