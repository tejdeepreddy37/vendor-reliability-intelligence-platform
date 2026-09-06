import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { RiskService } from '../../../core/services/risk.service';
import { VendorService } from '../../../core/services/vendor';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-risk-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './risk-form.html',
  styleUrl: './risk-form.scss'
})
export class RiskForm implements OnInit {
  private fb = inject(FormBuilder);
  private riskService = inject(RiskService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  riskForm!: FormGroup;
  isEditMode = false;
  riskId: number | null = null;

  vendors: Vendor[] = [];

  loading = true;
  submitting = false;
  errorMessage = '';

  riskTypes: string[] = [
    'Operational',
    'Financial',
    'Compliance',
    'Security',
    'Quality',
    'Delivery',
    'Contractual'
  ];

  severityOptions: string[] = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  statusOptions: string[] = [
    'Open',
    'Under Review',
    'Mitigated',
    'Closed'
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadVendorsAndCheckMode();
  }

  private initForm(): void {
    this.riskForm = this.fb.group({
      vendor_id: [null, [Validators.required]],
      risk_type: ['Operational', [Validators.required]],
      severity: ['Medium', [Validators.required]],
      impact_score: [50, [Validators.required, Validators.min(1), Validators.max(100)]],
      status: ['Open', [Validators.required]],
      description: ['', [Validators.required, Validators.maxLength(1000)]]
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
          this.riskId = Number(idParam);
          this.loadExistingRisk(this.riskId);
        } else if (vendorIdParam) {
          this.riskForm.patchValue({ vendor_id: Number(vendorIdParam) });
          this.loading = false;
          this.cdr.markForCheck();
        } else {
          if (this.vendors.length > 0 && !this.riskForm.get('vendor_id')?.value) {
            this.riskForm.patchValue({ vendor_id: this.vendors[0].id });
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

  private loadExistingRisk(id: number): void {
    this.riskService.getRiskById(id).subscribe({
      next: (risk) => {
        this.riskForm.patchValue({
          vendor_id: risk.vendor_id,
          risk_type: risk.risk_type,
          severity: risk.severity,
          impact_score: risk.impact_score,
          status: risk.status || 'Open',
          description: risk.description || ''
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading risk record:', err);
        this.errorMessage = 'Could not load risk record from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.riskForm.invalid) {
      this.riskForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const val = this.riskForm.value;

    if (this.isEditMode && this.riskId !== null) {
      const updatePayload = {
        vendor_id: Number(val.vendor_id),
        risk_type: val.risk_type,
        severity: val.severity,
        impact_score: Number(val.impact_score),
        status: val.status,
        description: val.description.trim()
      };

      this.riskService.updateRisk(this.riskId, updatePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/risk/list']);
        },
        error: (err) => {
          console.error('Update risk failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to update risk incident.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      const createPayload = {
        vendor_id: Number(val.vendor_id),
        risk_type: val.risk_type,
        severity: val.severity,
        impact_score: Number(val.impact_score),
        status: val.status,
        description: val.description.trim()
      };

      this.riskService.createRisk(createPayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/risk/list']);
        },
        error: (err) => {
          console.error('Create risk failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to record risk incident. Please check inputs.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/risk']);
  }
}