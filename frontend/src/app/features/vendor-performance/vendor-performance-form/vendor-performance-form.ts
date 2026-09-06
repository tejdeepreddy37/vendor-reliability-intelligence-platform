import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { VendorPerformanceService } from '../../../core/services/vendor-performance.service';
import { VendorService } from '../../../core/services/vendor';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-vendor-performance-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './vendor-performance-form.html',
  styleUrl: './vendor-performance-form.scss'
})
export class VendorPerformanceForm implements OnInit {
  private fb = inject(FormBuilder);
  private vendorPerformanceService = inject(VendorPerformanceService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  perfForm!: FormGroup;
  isEditMode = false;
  performanceId: number | null = null;

  vendors: Vendor[] = [];

  loading = true;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.loadVendorsAndCheckMode();
  }

  private initForm(): void {
    this.perfForm = this.fb.group({
      vendor_id: [null, [Validators.required]],
      on_time_deliveries: [0, [Validators.required, Validators.min(0)]],
      delayed_deliveries: [0, [Validators.required, Validators.min(0)]],
      quality_rating: [4.5, [Validators.required, Validators.min(0), Validators.max(5.0)]],
      service_rating: [4.5, [Validators.required, Validators.min(0), Validators.max(5.0)]],
      order_completion_rate: [95.0, [Validators.required, Validators.min(0), Validators.max(100)]],
      response_time: [4.0, [Validators.required, Validators.min(0)]],
      issue_resolution_time: [12.0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadVendorsAndCheckMode(): void {
    this.loading = true;
    this.errorMessage = '';

    this.vendorService.getAllVendors().subscribe({
      next: (vendors) => {
        this.vendors = Array.isArray(vendors) ? vendors : [];

        const idParam = this.route.snapshot.paramMap.get('id');
        const vendorIdParam = this.route.snapshot.paramMap.get('vendorId');

        if (idParam) {
          this.isEditMode = true;
          this.performanceId = Number(idParam);
          this.loadExistingPerformance(this.performanceId);
        } else if (vendorIdParam) {
          this.perfForm.patchValue({ vendor_id: Number(vendorIdParam) });
          this.loading = false;
          this.cdr.markForCheck();
        } else {
          if (this.vendors.length > 0 && !this.perfForm.get('vendor_id')?.value) {
            this.perfForm.patchValue({ vendor_id: this.vendors[0].id });
          }
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error loading vendors:', err);
        this.errorMessage = 'Failed to load supplier directory from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadExistingPerformance(id: number): void {
    this.vendorPerformanceService.getVendorPerformanceById(id).subscribe({
      next: (perf) => {
        this.perfForm.patchValue({
          vendor_id: perf.vendor_id,
          on_time_deliveries: perf.on_time_deliveries,
          delayed_deliveries: perf.delayed_deliveries,
          quality_rating: perf.quality_rating,
          service_rating: perf.service_rating,
          order_completion_rate: perf.order_completion_rate,
          response_time: perf.response_time,
          issue_resolution_time: perf.issue_resolution_time
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading performance record:', err);
        this.errorMessage = 'Could not load performance record from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.perfForm.invalid) {
      this.perfForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const val = this.perfForm.value;

    const payload = {
      vendor_id: Number(val.vendor_id),
      on_time_deliveries: Number(val.on_time_deliveries),
      delayed_deliveries: Number(val.delayed_deliveries),
      quality_rating: Number(val.quality_rating),
      service_rating: Number(val.service_rating),
      order_completion_rate: Number(val.order_completion_rate),
      response_time: Number(val.response_time),
      issue_resolution_time: Number(val.issue_resolution_time)
    };

    if (this.isEditMode && this.performanceId !== null) {
      this.vendorPerformanceService.updateVendorPerformance(this.performanceId, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/vendor-performance']);
        },
        error: (err) => {
          console.error('Update performance failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to update performance record.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.vendorPerformanceService.createVendorPerformance(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/vendor-performance']);
        },
        error: (err) => {
          console.error('Create performance failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to create performance record. A record may already exist for this supplier.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/vendor-performance']);
  }
}