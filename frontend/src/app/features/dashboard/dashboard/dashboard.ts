import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContractService } from '../../../core/services/contract';
import { RiskService } from '../../../core/services/risk.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VendorService } from '../../../core/services/vendor';
import { VendorPerformanceService } from '../../../core/services/vendor-performance.service';

import {
  DashboardSummary,
  SpendVelocityAnalytics,
  MonthlySpendPoint
} from '../../../core/models/dashboard.model';
import { Notification } from '../../../core/models/notification.model';
import { Vendor } from '../../../core/models/vendor.model';
import { VendorPerformance } from '../../../core/models/vendor-performance.model';

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  type: 'amber' | 'red' | 'blue' | 'purple';
  actionLabel: string;
  route: string;
}

export interface SelectedFactorBar {
  metric: string;
  series: 'Current' | 'Target' | 'Historical';
  value: number;
}

export interface SupplierPerformanceRow {
  vendor: Vendor;
  performance?: VendorPerformance;
  deliveryRate: number;
  qualityRating: number;
  completionRate: number;
  responseTime: number;
  reliabilityScore?: number;
  riskTier: string;
}

export interface ChartRenderPoint {
  index: number;
  x: number;
  y: number;
  percentX: number;
  percentY: number;
  month: string;
  monthFull: string;
  data: MonthlySpendPoint;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {

  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);
  private readonly contractService = inject(ContractService);
  private readonly riskService = inject(RiskService);
  private readonly notificationService = inject(NotificationService);
  private readonly vendorService = inject(VendorService);
  private readonly vendorPerformanceService = inject(VendorPerformanceService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser$ = this.authService.currentUser$;

  summary: DashboardSummary | null = null;
  recentNotifications: Notification[] = [];
  attentionItems: AttentionItem[] = [];
  supplierRows: SupplierPerformanceRow[] = [];

  activePercentage = 0;
  pendingPercentage = 0;
  lastSynced: Date = new Date();

  loading = true;
  error = false;
  errorMessage = '';

  private initialResizeObserver?: ResizeObserver;
  private initialGuardCleanup?: () => void;
  private initialLoadDone = false;

  // -------------------------------------------------------------
  // Interactive Spend Velocity & Order Volume Chart State
  // -------------------------------------------------------------
  spendAnalytics: SpendVelocityAnalytics | null = null;
  chartLoading = false;
  chartError = false;

  selectedYear = 2026;
  availableYears: number[] = [2026, 2025];
  selectedMonthFilter = 'all';

  readonly monthsOptions = [
    { label: 'All Months', value: 'all' },
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' }
  ];

  chartPoints: ChartRenderPoint[] = [];
  svgWaveStrokePath = '';
  svgWaveAreaPath = '';
  yAxisScaleLabels: string[] = ['₹20L', '₹16L', '₹12L', '₹8L', '₹4L', '₹0'];

  hoveredPoint: ChartRenderPoint | null = null;
  selectedPoint: ChartRenderPoint | null = null;
  peakPoint: ChartRenderPoint | null = null;

  // Multi-Factor Reliability chart interaction state
  selectedFactorBar: SelectedFactorBar | null = null;

  selectFactorBar(metric: string, series: 'Current' | 'Target' | 'Historical', value: number): void {
    if (this.selectedFactorBar?.metric === metric && this.selectedFactorBar?.series === series) {
      this.selectedFactorBar = null;
    } else {
      this.selectedFactorBar = { metric, series, value };
    }
    this.cdr.markForCheck();
  }

  isFactorBarSelected(metric: string, series: 'Current' | 'Target' | 'Historical'): boolean {
    return this.selectedFactorBar?.metric === metric && this.selectedFactorBar?.series === series;
  }

  ngOnInit(): void {
    this.setupInitialScrollGuard();
    this.resetScroll();
    this.loadDashboard(true);
    this.loadSpendVelocity(this.selectedYear, true);
  }

  ngOnDestroy(): void {
    this.initialResizeObserver?.disconnect();
    if (this.initialGuardCleanup) {
      this.initialGuardCleanup();
    }
  }

  private setupInitialScrollGuard(): void {
    if (typeof window === 'undefined') return;

    this.resetScroll();

    if (typeof ResizeObserver !== 'undefined') {
      this.initialResizeObserver = new ResizeObserver(() => {
        if (this.initialLoadDone) return;
        this.resetScroll();
        if (this.summary && this.supplierRows.length > 0 && this.spendAnalytics) {
          this.initialLoadDone = true;
          setTimeout(() => {
            this.initialResizeObserver?.disconnect();
            this.initialResizeObserver = undefined;
          }, 80);
        }
      });

      const container = document.querySelector('.dashboard-container') || document.querySelector('.page-content');
      if (container) {
        this.initialResizeObserver.observe(container);
      }
    }

    const onUserScroll = () => {
      this.initialLoadDone = true;
      this.initialResizeObserver?.disconnect();
      this.initialResizeObserver = undefined;
    };

    window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
    window.addEventListener('touchmove', onUserScroll, { passive: true, once: true });

    this.initialGuardCleanup = () => {
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchmove', onUserScroll);
    };

    setTimeout(() => {
      this.initialLoadDone = true;
      this.initialResizeObserver?.disconnect();
      this.initialResizeObserver = undefined;
    }, 1500);
  }

  private resetScroll(): void {
    if (typeof window !== 'undefined') {
      const el = document.querySelector('.page-content') as HTMLElement | null;
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
      const tableContainer = document.querySelector('.table-scroll-container') as HTMLElement | null;
      if (tableContainer) {
        tableContainer.scrollLeft = 0;
      }
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      window.requestAnimationFrame(() => {
        const target = document.querySelector('.page-content') as HTMLElement | null;
        if (target) {
          target.scrollTop = 0;
          target.scrollLeft = 0;
        }
        const table = document.querySelector('.table-scroll-container') as HTMLElement | null;
        if (table) {
          table.scrollLeft = 0;
        }
      });
    }
  }

  getGreetingText(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get averageOrderValue(): number {
    if (!this.summary || !this.summary.total_purchase_orders) return 0;
    return this.summary.total_procurement_value / this.summary.total_purchase_orders;
  }

  get averageContractValue(): number {
    if (!this.summary || !this.summary.active_contracts) return 0;
    return this.summary.total_contract_value / this.summary.active_contracts;
  }

  get totalRiskIncidents(): number {
    if (!this.summary) return 0;
    return (
      (this.summary.critical_risks || 0) +
      (this.summary.high_risks || 0) +
      (this.summary.medium_risks || 0) +
      (this.summary.low_risks || 0)
    );
  }

  // -------------------------------------------------------------
  // Dynamic Synchronized Bottom Summary Metrics
  // -------------------------------------------------------------
  get displayedPurchaseOrders(): number {
    if (this.selectedPoint) {
      return this.selectedPoint.data.purchase_orders_count;
    }
    if (this.selectedMonthFilter !== 'all') {
      const monthIdx = Number(this.selectedMonthFilter);
      const point = this.chartPoints.find(p => p.data.month_index === monthIdx);
      return point ? point.data.purchase_orders_count : 0;
    }
    return this.spendAnalytics?.total_orders_year ?? (this.summary?.total_purchase_orders || 0);
  }

  get displayedAverageOrderValue(): number {
    if (this.selectedPoint) {
      return this.selectedPoint.data.average_order_value;
    }
    if (this.selectedMonthFilter !== 'all') {
      const monthIdx = Number(this.selectedMonthFilter);
      const point = this.chartPoints.find(p => p.data.month_index === monthIdx);
      return point ? point.data.average_order_value : 0;
    }
    return this.spendAnalytics?.average_order_value_year ?? this.averageOrderValue;
  }

  get displayedInquiryThreads(): number {
    return this.spendAnalytics?.total_communications_year ?? (this.summary?.total_communications || 0);
  }

  get displayedAverageContractValue(): number {
    return this.spendAnalytics?.average_contract_value_year ?? this.averageContractValue;
  }

  loadDashboard(isInitial = false): void {
    this.loading = true;
    this.error = false;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.lastSynced = new Date();

        if (summary.total_vendors > 0) {
          this.activePercentage = Math.round(
            (summary.active_vendors / summary.total_vendors) * 100
          );
          this.pendingPercentage = Math.round(
            (summary.pending_vendors / summary.total_vendors) * 100
          );
        } else {
          this.activePercentage = 0;
          this.pendingPercentage = 0;
        }

        // Build attention items with initial summary
        this.buildAttentionItems(summary, 0);
        this.loading = false;
        this.cdr.markForCheck();
        if (isInitial) {
          this.resetScroll();
        }

        // Fetch expiring contracts to enrich attention items
        this.contractService.getExpiringContracts().subscribe({
          next: (contracts) => {
            if (this.summary) {
              this.buildAttentionItems(this.summary, contracts ? contracts.length : 0);
              this.cdr.markForCheck();
            }
          },
          error: (err) => {
            console.warn('Expiring contracts check notice:', err);
          }
        });
      },

      error: (err) => {
        console.error('Dashboard synchronization failed:', err);
        this.loading = false;
        this.error = true;
        this.errorMessage =
          err?.status === 0
            ? 'Unable to connect to the backend server. Please verify the API service is active.'
            : 'An error occurred while loading dashboard intelligence.';
        this.cdr.markForCheck();
      }
    });

    // Fetch vendors and performance scorecards to populate supplier table
    this.vendorService.getAllVendors().subscribe({
      next: (vendors) => {
        this.vendorPerformanceService.getAllVendorPerformance().subscribe({
          next: (performances) => {
            const perfMap = new Map<number, VendorPerformance>();
            (performances || []).forEach((p) => {
              if (p.vendor_id) perfMap.set(p.vendor_id, p);
            });

            this.supplierRows = (vendors || [])
              .filter((vendor) => vendor.id && perfMap.has(vendor.id))
              .map((vendor) => {
                const perf = perfMap.get(vendor.id!)!;
                const totalDels = (perf.on_time_deliveries || 0) + (perf.delayed_deliveries || 0);
                const deliveryRate = totalDels > 0 ? Math.round((perf.on_time_deliveries / totalDels) * 100) : 0;

                const reliabilityScore = perf.performance_score;
                let riskTier = 'UNSCORED';
                if (reliabilityScore != null) {
                  if (reliabilityScore < 60) riskTier = 'HIGH';
                  else if (reliabilityScore < 80) riskTier = 'MEDIUM';
                  else riskTier = 'LOW';
                }

                return {
                  vendor,
                  performance: perf,
                  deliveryRate,
                  qualityRating: perf.quality_rating || 0,
                  completionRate: perf.order_completion_rate || 0,
                  responseTime: perf.response_time || 0,
                  reliabilityScore,
                  riskTier
                };
              });
            this.cdr.markForCheck();
            if (isInitial) {
              this.resetScroll();
            }
          },
          error: (err) => {
            console.warn('Performance fetch notice:', err);
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.warn('Vendors fetch notice:', err);
      }
    });

    // Fetch recent notifications
    this.notificationService.getAllNotifications().subscribe({
      next: (notifications) => {
        this.recentNotifications = (notifications || []).slice(0, 5);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Notifications fetch notice:', err);
        this.recentNotifications = [];
        this.cdr.markForCheck();
      }
    });
  }

  // -------------------------------------------------------------
  // Spend Velocity Analytics Data Loading & SVG Generation
  // -------------------------------------------------------------
  loadSpendVelocity(year?: number, isInitial = false): void {
    this.chartLoading = true;
    this.chartError = false;
    this.cdr.markForCheck();

    this.dashboardService.getSpendVelocity(year || this.selectedYear).subscribe({
      next: (analytics) => {
        this.spendAnalytics = analytics;
        this.selectedYear = analytics.year;
        if (analytics.available_years && analytics.available_years.length > 0) {
          this.availableYears = analytics.available_years;
        }

        this.buildChartGeometry(analytics);
        this.chartLoading = false;
        this.cdr.markForCheck();
        if (isInitial) {
          this.resetScroll();
        }
      },
      error: (err) => {
        console.error('Failed to load spend velocity analytics:', err);
        this.chartLoading = false;
        this.chartError = true;
        this.cdr.markForCheck();
      }
    });
  }

  private buildChartGeometry(analytics: SpendVelocityAnalytics): void {
    const monthly = analytics.monthly_data || [];
    if (monthly.length === 0) {
      this.chartPoints = [];
      this.svgWaveAreaPath = '';
      this.svgWaveStrokePath = '';
      return;
    }

    // Determine max spend scale
    const rawMax = Math.max(...monthly.map(m => m.total_spend), 0);
    // Round max up to nearest convenient ceiling
    let maxScale = 2000000;
    if (rawMax > 5000000) maxScale = Math.ceil(rawMax / 1000000) * 1000000;
    else if (rawMax > 2000000) maxScale = Math.ceil(rawMax / 500000) * 500000;
    else if (rawMax > 1000000) maxScale = 2000000;
    else if (rawMax > 500000) maxScale = 1000000;
    else if (rawMax > 0) maxScale = 500000;

    // Build Y-axis labels (5 intervals)
    this.yAxisScaleLabels = [
      this.formatCompactINR(maxScale),
      this.formatCompactINR(maxScale * 0.8),
      this.formatCompactINR(maxScale * 0.6),
      this.formatCompactINR(maxScale * 0.4),
      this.formatCompactINR(maxScale * 0.2),
      '₹0'
    ];

    // Compute (x, y) for all 12 points in 600 x 140 coordinate system
    // X coordinates: 12 months spaced from 25 to 575 (step = 50)
    // Y coordinates: baseline at 122 (for 0), peak at 20 (for maxScale)
    const points: ChartRenderPoint[] = [];
    let currentPeak: ChartRenderPoint | null = null;
    let maxPointVal = -1;

    for (let i = 0; i < monthly.length; i++) {
      const d = monthly[i];
      const x = i * 50 + 25;
      const ratio = Math.min(Math.max(d.total_spend / maxScale, 0), 1);
      const y = 122 - ratio * 102;
      const percentX = Math.round((x / 600) * 100);
      const percentY = Math.round((y / 140) * 100);

      const renderPt: ChartRenderPoint = {
        index: i,
        x,
        y: Math.round(y * 10) / 10,
        percentX,
        percentY,
        month: d.month,
        monthFull: d.month_full,
        data: d
      };

      points.push(renderPt);

      if (d.total_spend > maxPointVal && d.total_spend > 0) {
        maxPointVal = d.total_spend;
        currentPeak = renderPt;
      }
    }

    this.chartPoints = points;
    this.peakPoint = currentPeak || (points.length > 8 ? points[8] : points[0]);

    // Generate smooth SVG paths
    this.generateSmoothPaths(points);

    // If a month was previously selected, re-link to new point
    if (this.selectedPoint) {
      const match = points.find(p => p.data.month_index === this.selectedPoint!.data.month_index);
      this.selectedPoint = match || null;
    }
  }

  private generateSmoothPaths(points: ChartRenderPoint[]): void {
    if (points.length === 0) return;

    if (points.length === 1) {
      const p = points[0];
      this.svgWaveStrokePath = `M 0,${p.y} L 600,${p.y}`;
      this.svgWaveAreaPath = `M 0,${p.y} L 600,${p.y} L 600,140 L 0,140 Z`;
      return;
    }

    // Build smooth cubic bezier curve
    let dStroke = `M 0,${points[0].y} L ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dStroke += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const lastP = points[points.length - 1];
    dStroke += ` L 600,${lastP.y}`;

    this.svgWaveStrokePath = dStroke;
    this.svgWaveAreaPath = `${dStroke} L 600,140 L 0,140 Z`;
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.selectedPoint = null;
    this.hoveredPoint = null;
    this.loadSpendVelocity(this.selectedYear);
  }

  onMonthFilterChange(monthVal: string): void {
    this.selectedMonthFilter = monthVal;
    if (monthVal === 'all') {
      this.selectedPoint = null;
    } else {
      const monthIdx = Number(monthVal);
      const targetPoint = this.chartPoints.find(p => p.data.month_index === monthIdx);
      if (targetPoint) {
        this.selectedPoint = targetPoint;
      }
    }
    this.cdr.markForCheck();
  }

  onPointHover(pt: ChartRenderPoint | null): void {
    this.hoveredPoint = pt;
    this.cdr.markForCheck();
  }

  onPointClick(pt: ChartRenderPoint): void {
    if (this.selectedPoint?.month === pt.month) {
      // Toggle off if clicked again
      this.selectedPoint = null;
      this.selectedMonthFilter = 'all';
    } else {
      this.selectedPoint = pt;
      this.selectedMonthFilter = String(pt.data.month_index);
    }
    this.cdr.markForCheck();
  }

  clearPointSelection(): void {
    this.selectedPoint = null;
    this.selectedMonthFilter = 'all';
    this.cdr.markForCheck();
  }

  private buildAttentionItems(summary: DashboardSummary, expiringContractsCount: number): void {
    const items: AttentionItem[] = [];

    if (summary.pending_vendors > 0) {
      items.push({
        id: 'pending-vendors',
        title: 'Vendor Onboarding Approvals',
        description: `${summary.pending_vendors} vendor registration(s) currently awaiting compliance and management review.`,
        type: 'amber',
        actionLabel: 'Review Pending',
        route: '/vendors/pending'
      });
    }

    if (expiringContractsCount > 0) {
      items.push({
        id: 'expiring-contracts',
        title: 'Contract Expiration Warning',
        description: `${expiringContractsCount} active procurement contract(s) expiring within the next 30 days.`,
        type: 'amber',
        actionLabel: 'View Contracts',
        route: '/contracts'
      });
    }

    const severeRisks = (summary.critical_risks || 0) + (summary.high_risks || 0);
    if (severeRisks > 0) {
      items.push({
        id: 'critical-risks',
        title: 'Elevated Risk Exposure',
        description: `${severeRisks} high or critical risk issue(s) identified across the supplier network requiring mitigation.`,
        type: 'red',
        actionLabel: 'Assess Risks',
        route: '/risk'
      });
    } else if (summary.high_risk_vendors > 0) {
      items.push({
        id: 'high-risk-vendors',
        title: 'At-Risk Vendors Monitored',
        description: `${summary.high_risk_vendors} vendor(s) categorized with high risk indicators based on historical evaluation.`,
        type: 'red',
        actionLabel: 'View Risk Registry',
        route: '/risk'
      });
    }

    this.attentionItems = items;
  }

  getOverallReliabilityLabel(score: number): string {
    if (score >= 80) return 'LOW RISK / PREFERRED';
    if (score >= 60) return 'MODERATE RISK';
    if (score > 0) return 'HIGH RISK';
    return 'NO EVALUATION DATA';
  }

  getReliabilityBadgeClass(score: number): string {
    if (score >= 80) return 'badge-green';
    if (score >= 60) return 'badge-amber';
    if (score > 0) return 'badge-red';
    return 'badge-neutral';
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return '₹0';
    return '₹' + Math.round(value).toLocaleString('en-IN');
  }

  formatINR(value?: number): string {
    if (value === undefined || value === null) return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  formatCompactINR(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}