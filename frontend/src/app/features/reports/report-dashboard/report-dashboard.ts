import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DashboardService } from '../../../core/services/dashboard.service';
import { ReportService } from '../../../core/services/report.service';
import { DashboardSummary } from '../../../core/models/dashboard.model';
import { Report } from '../../../core/models/report.model';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './report-dashboard.html',
  styleUrl: './report-dashboard.scss',
})
export class ReportDashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private reportService = inject(ReportService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  summary: DashboardSummary | null = null;
  recentReports: Report[] = [];

  loading = true;
  generating = false;
  exporting = false;
  errorMessage = '';
  successMessage = '';

  selectedReportType = 'Procurement Summary';
  selectedFormat = 'CSV';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getSummary().subscribe({
      next: (sum) => {
        this.summary = sum;
        this.loadReports();
      },
      error: (err) => {
        console.error('Failed to load summary metrics:', err);
        this.errorMessage = 'Failed to load procurement analytics from backend.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadReports(): void {
    this.reportService.getAllReports().subscribe({
      next: (reports) => {
        this.recentReports = Array.isArray(reports) ? reports : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to load reports:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  generateReport(): void {
    this.generating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reportService.generateReport(this.selectedReportType, this.selectedFormat).subscribe({
      next: (created) => {
        this.generating = false;
        this.successMessage = `Generated "${created.report_name}" successfully.`;
        this.recentReports.unshift(created);
        this.cdr.markForCheck();

        // Automatically trigger real download based on format
        if (created.id) {
          this.downloadReportFile(created, this.selectedFormat);
        }
      },
      error: (err) => {
        console.error('Failed to generate report:', err);
        this.errorMessage = 'Failed to generate procurement report.';
        this.generating = false;
        this.cdr.markForCheck();
      }
    });
  }

  downloadReportFile(report: Report, format: string = 'CSV'): void {
    if (!report.id) return;
    this.exporting = true;
    const fmt = (format || report.file_format || 'CSV').toUpperCase();
    const ext = fmt === 'PDF' ? 'pdf' : (fmt === 'EXCEL' || fmt === 'XLSX' ? 'xlsx' : 'csv');

    this.reportService.exportReportFile(report.id, fmt).subscribe({
      next: (blob) => {
        this.triggerFileDownload(blob, `${report.report_name.replace(/\s+/g, '_')}.${ext}`);
        this.exporting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Download failed:', err);
        alert(`Could not download report in ${fmt} format.`);
        this.exporting = false;
        this.cdr.markForCheck();
      }
    });
  }

  exportCategoryFile(category: string, format: string = 'CSV'): void {
    this.exporting = true;
    const fmt = format.toUpperCase();
    const ext = fmt === 'PDF' ? 'pdf' : (fmt === 'EXCEL' || fmt === 'XLSX' ? 'xlsx' : 'csv');
    const cleanName = category.toLowerCase().replace(/\s+/g, '_');

    let obs;
    if (fmt === 'PDF') {
      obs = this.reportService.exportAnalyticsPdf(category);
    } else if (fmt === 'EXCEL' || fmt === 'XLSX') {
      obs = this.reportService.exportAnalyticsExcel(category);
    } else {
      obs = this.reportService.exportAnalyticsCsv(category);
    }

    obs.subscribe({
      next: (blob) => {
        this.triggerFileDownload(blob, `vrip_${cleanName}_export.${ext}`);
        this.exporting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Category export failed:', err);
        alert(`Could not export ${category} analytics as ${fmt}.`);
        this.exporting = false;
        this.cdr.markForCheck();
      }
    });
  }

  exportCategoryCsv(category: string): void {
    this.exportCategoryFile(category, 'CSV');
  }

  downloadReportCsv(report: Report): void {
    this.downloadReportFile(report, 'CSV');
  }

  deleteReport(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Delete this report record?')) return;

    this.reportService.deleteReport(id).subscribe({
      next: () => {
        this.recentReports = this.recentReports.filter((r) => r.id !== id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to delete report:', err);
        alert('Could not delete report record.');
      }
    });
  }

  private triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  navigateToList(): void {
    this.router.navigate(['/reports/list']);
  }

  navigateToAdd(): void {
    this.router.navigate(['/reports/add']);
  }

  navigateToModule(route: string): void {
    this.router.navigate([route]);
  }
}