import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Report } from '../../../core/models/report.model';
import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
})
export class ReportList implements OnInit {
  private reportService = inject(ReportService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  reports: Report[] = [];
  loading = true;
  downloading = false;
  errorMessage = '';

  searchText = '';
  categoryFilter = 'all';

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reportService.getAllReports().subscribe({
      next: (data) => {
        this.reports = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reports:', err);
        this.errorMessage = 'Failed to load report history from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredReports(): Report[] {
    return this.reports.filter((r) => {
      const term = this.searchText.trim().toLowerCase();
      const name = (r.report_name || '').toLowerCase();
      const type = (r.report_type || '').toLowerCase();
      const by = (r.generated_by || '').toLowerCase();

      const matchesSearch = !term || name.includes(term) || type.includes(term) || by.includes(term);

      let matchesCategory = true;
      if (this.categoryFilter !== 'all') {
        matchesCategory = type.includes(this.categoryFilter.toLowerCase());
      }

      return matchesSearch && matchesCategory;
    });
  }

  downloadReport(event: Event, report: Report): void {
    event.stopPropagation();
    if (!report.id) return;
    this.downloading = true;

    this.reportService.exportReportCsv(report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.report_name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.downloading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to export CSV:', err);
        alert('Could not export report data to CSV.');
        this.downloading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReport(event: Event, id: number): void {
    event.stopPropagation();
    if (!confirm('Delete this report record?')) return;

    this.reportService.deleteReport(id).subscribe({
      next: () => {
        this.reports = this.reports.filter((r) => r.id !== id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to delete report:', err);
        alert('Could not delete report record.');
      }
    });
  }

  openDetails(id: number): void {
    this.router.navigate(['/reports/details', id]);
  }

  navigateToAdd(): void {
    this.router.navigate(['/reports/add']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/reports']);
  }
}