import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { Report } from '../../../core/models/report.model';
import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-report-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-details.html',
  styleUrl: './report-details.scss',
})
export class ReportDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reportService = inject(ReportService);
  private cdr = inject(ChangeDetectorRef);

  report?: Report;
  loading = false;
  downloading = false;
  error = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadReport(id);
    }
  }

  loadReport(id: number): void {
    this.loading = true;
    this.error = '';

    this.reportService.getReportById(id).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load report:', err);
        this.error = 'Failed to load report from PostgreSQL database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  downloadCsv(): void {
    if (!this.report?.id) return;
    this.downloading = true;

    this.reportService.exportReportCsv(this.report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.report!.report_name.replace(/\s+/g, '_')}.csv`;
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

  navigateBack(): void {
    this.router.navigate(['/reports/list']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/reports']);
  }
}