import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-report-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './report-form.html',
  styleUrl: './report-form.scss'
})
export class ReportForm implements OnInit {
  private fb = inject(FormBuilder);
  private reportService = inject(ReportService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  reportForm!: FormGroup;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.reportForm = this.fb.group({
      report_name: ['', [Validators.required, Validators.maxLength(255)]],
      report_type: ['Procurement Summary', [Validators.required]],
      generated_by: ['Procurement Auditor', [Validators.required]],
      file_format: ['CSV', [Validators.required]],
      status: ['Generated']
    });

    this.onTypeChange('Procurement Summary');
  }

  onTypeChange(type: string): void {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.reportForm.patchValue({
      report_name: `${type} Report - ${todayStr}`
    });
  }

  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload = this.reportForm.value;

    this.reportService.createReport(payload).subscribe({
      next: (created) => {
        this.submitting = false;

        // Auto download if CSV
        if (created.id && created.file_format === 'CSV') {
          this.reportService.exportReportCsv(created.id).subscribe({
            next: (blob) => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${created.report_name.replace(/\s+/g, '_')}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }
          });
        }

        this.router.navigate(['/reports/list']);
      },
      error: (err) => {
        console.error('Failed to create report:', err);
        this.errorMessage = err?.error?.detail || 'Failed to record and generate report.';
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/reports/list']);
  }
}