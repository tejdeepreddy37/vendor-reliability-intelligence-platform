import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, catchError, map } from 'rxjs';

import { VendorPerformanceService } from '../../../core/services/vendor-performance.service';
import { VendorService } from '../../../core/services/vendor';
import { ReliabilityService } from '../../../core/services/reliability.service';
import { PurchaseOrderService } from '../../../core/services/purchase-order';
import { ContractService } from '../../../core/services/contract';
import { RiskService } from '../../../core/services/risk.service';

import { VendorPerformance } from '../../../core/models/vendor-performance.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Reliability } from '../../../core/models/reliability.model';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Contract } from '../../../core/models/contract.model';
import { Risk } from '../../../core/models/risk.model';

@Component({
  selector: 'app-vendor-performance-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './vendor-performance-details.html',
  styleUrl: './vendor-performance-details.scss'
})
export class VendorPerformanceDetails implements OnInit {
  private vendorPerformanceService = inject(VendorPerformanceService);
  private vendorService = inject(VendorService);
  private reliabilityService = inject(ReliabilityService);
  private poService = inject(PurchaseOrderService);
  private contractService = inject(ContractService);
  private riskService = inject(RiskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  vendorId: number | null = null;
  performanceId: number | null = null;

  vendor: Vendor | null = null;
  performance: VendorPerformance | null = null;
  reliability: Reliability | null = null;
  purchaseOrders: PurchaseOrder[] = [];
  contracts: Contract[] = [];
  risks: Risk[] = [];

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.resolveAndLoad(Number(idParam));
      } else {
        this.errorMessage = 'No supplier or performance identifier provided.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private resolveAndLoad(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    // First attempt: Check if the ID is a Vendor directly
    this.vendorService.getVendorById(id).pipe(
      catchError(() => of(null))
    ).subscribe((directVendor) => {
      if (directVendor && directVendor.id) {
        this.vendorId = directVendor.id;
        this.vendor = directVendor;
        this.loadAllPerformanceData(this.vendorId);
      } else {
        // Second attempt: Check if the ID is a VendorPerformance record ID
        this.vendorPerformanceService.getVendorPerformanceById(id).pipe(
          catchError(() => of(null))
        ).subscribe((perfRecord) => {
          if (perfRecord && perfRecord.vendor_id) {
            this.performance = perfRecord;
            this.performanceId = perfRecord.id ?? null;
            this.vendorId = perfRecord.vendor_id;

            this.vendorService.getVendorById(this.vendorId).subscribe({
              next: (v) => {
                this.vendor = v;
                this.loadAllPerformanceData(this.vendorId!);
              },
              error: (err) => {
                console.error('Error loading vendor:', err);
                this.errorMessage = 'Could not load supplier information for this performance record.';
                this.loading = false;
                this.cdr.markForCheck();
              }
            });
          } else {
            this.errorMessage = `Performance record or supplier #${id} not found in database.`;
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  private loadAllPerformanceData(vendorId: number): void {
    forkJoin({
      performance: this.vendorPerformanceService.getVendorPerformanceByVendorId(vendorId).pipe(
        catchError((err) => {
          console.warn('Vendor performance record not found or error:', err);
          return of(null);
        })
      ),
      reliability: this.reliabilityService.getVendorReliability(vendorId).pipe(
        catchError((err) => {
          console.warn('Reliability calculation error:', err);
          return of(null);
        })
      ),
      pos: this.poService.getAllPurchaseOrders().pipe(
        map((pos) => pos.filter((p) => p.vendor_id === vendorId)),
        catchError(() => of([]))
      ),
      contracts: this.contractService.getContractsByVendor(vendorId).pipe(
        catchError(() => of([]))
      ),
      risks: this.riskService.getRisksByVendor(vendorId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ performance, reliability, pos, contracts, risks }) => {
        if (performance) {
          this.performance = performance;
          this.performanceId = performance.id ?? null;
        }
        this.reliability = reliability;
        this.purchaseOrders = Array.isArray(pos) ? pos : [];
        this.contracts = Array.isArray(contracts) ? contracts : [];
        this.risks = Array.isArray(risks) ? risks : [];

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load performance details:', err);
        this.errorMessage = 'Failed to load supplier performance analytics from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get totalDeliveries(): number {
    if (!this.performance) return 0;
    return (this.performance.on_time_deliveries || 0) + (this.performance.delayed_deliveries || 0);
  }

  get onTimeDeliveryRate(): number {
    if (this.totalDeliveries === 0) return 0;
    return Math.round(((this.performance!.on_time_deliveries || 0) / this.totalDeliveries) * 1000) / 10;
  }

  getPerformanceTier(score: number | undefined): string {
    if (score == null) return 'Pending Evaluation';
    if (score >= 90) return 'Top Performer (Tier 1)';
    if (score >= 80) return 'Strong Performer (Tier 2)';
    if (score >= 65) return 'Satisfactory (Tier 3)';
    return 'Underperforming (Action Required)';
  }

  getScoreColorClass(score: number | undefined): string {
    if (score == null) return 'score-neutral';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-poor';
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

  editPerformance(): void {
    if (this.performance?.id) {
      this.router.navigate(['/vendor-performance/edit', this.performance.id]);
    } else if (this.vendorId) {
      this.router.navigate(['/vendor-performance/add', this.vendorId]);
    }
  }

  backToPortfolio(): void {
    this.router.navigate(['/vendor-performance']);
  }

  navigateToVendor(): void {
    if (this.vendorId) {
      this.router.navigate(['/vendors']);
    }
  }

  navigateToPOs(): void {
    this.router.navigate(['/purchase-orders']);
  }

  navigateToContracts(): void {
    this.router.navigate(['/contracts']);
  }

  navigateToRisks(): void {
    if (this.vendorId) {
      this.router.navigate(['/risk/details', this.vendorId]);
    } else {
      this.router.navigate(['/risk']);
    }
  }
}
