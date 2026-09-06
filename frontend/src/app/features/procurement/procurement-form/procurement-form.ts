import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ProcurementService } from '../../../core/services/procurement';
import { VendorService } from '../../../core/services/vendor';
import { Procurement } from '../../../core/models/procurement.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-procurement-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './procurement-form.html',
  styleUrls: ['./procurement-form.scss']
})
export class ProcurementForm implements OnInit {
  private fb = inject(FormBuilder);
  private procurementService = inject(ProcurementService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  procurementForm!: FormGroup;
  isEditMode = false;
  procurementId: number | null = null;

  vendors: Vendor[] = [];
  loading = true;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.loadVendorsAndCheckMode();
  }

  private initForm(): void {
    const today = new Date().toISOString().substring(0, 10);
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 14);
    const defaultDelivery = nextMonth.toISOString().substring(0, 10);

    this.procurementForm = this.fb.group({
      request_number: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      vendor_id: [null, [Validators.required]],
      requested_by: ['', [Validators.required, Validators.maxLength(150)]],
      approved_by: ['', [Validators.maxLength(150)]],
      request_date: [today, [Validators.required]],
      expected_delivery: [defaultDelivery],
      total_amount: [null, [Validators.required, Validators.min(0.01)]],
      status: ['Pending', [Validators.required]],
      invoice_number: ['', [Validators.maxLength(100)]],
      remarks: ['', [Validators.maxLength(500)]]
    });
  }

  private loadVendorsAndCheckMode(): void {
    this.loading = true;
    this.errorMessage = '';

    this.vendorService.getAllVendors().subscribe({
      next: (vendors) => {
        this.vendors = Array.isArray(vendors) ? vendors : [];

        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          this.isEditMode = true;
          this.procurementId = Number(idParam);
          this.loadExistingProcurement(this.procurementId);
        } else {
          // Pre-select first vendor if available
          if (this.vendors.length > 0 && !this.procurementForm.get('vendor_id')?.value) {
            this.procurementForm.patchValue({ vendor_id: this.vendors[0].id });
          }
          // Suggest a default request number
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          this.procurementForm.patchValue({
            request_number: `PR-2026-${randomSuffix}`,
            requested_by: 'Procurement Officer'
          });
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error loading vendor directory:', err);
        this.errorMessage = 'Failed to load supplier directory from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadExistingProcurement(id: number): void {
    this.procurementService.getProcurementById(id).subscribe({
      next: (p) => {
        this.procurementForm.patchValue({
          request_number: p.request_number,
          title: p.title,
          description: p.description || '',
          vendor_id: p.vendor_id,
          requested_by: p.requested_by,
          approved_by: p.approved_by || '',
          request_date: p.request_date ? p.request_date.substring(0, 10) : '',
          expected_delivery: p.expected_delivery ? p.expected_delivery.substring(0, 10) : '',
          total_amount: p.total_amount,
          status: p.status || 'Pending',
          invoice_number: p.invoice_number || '',
          remarks: p.remarks || ''
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading procurement:', err);
        this.errorMessage = 'Could not load procurement request details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.procurementForm.invalid) {
      this.procurementForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const val = this.procurementForm.value;

    if (this.isEditMode && this.procurementId !== null) {
      const updatePayload: Partial<Procurement> = {
        title: val.title.trim(),
        description: val.description ? val.description.trim() : null,
        vendor_id: Number(val.vendor_id),
        approved_by: val.approved_by ? val.approved_by.trim() : null,
        expected_delivery: val.expected_delivery || null,
        total_amount: Number(val.total_amount),
        status: val.status,
        invoice_number: val.invoice_number ? val.invoice_number.trim() : null,
        remarks: val.remarks ? val.remarks.trim() : null
      };

      this.procurementService.updateProcurement(this.procurementId, updatePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/procurement']);
        },
        error: (err) => {
          console.error('Update procurement failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to update procurement request.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      const createPayload: Procurement = {
        request_number: val.request_number.trim(),
        title: val.title.trim(),
        description: val.description ? val.description.trim() : undefined,
        vendor_id: Number(val.vendor_id),
        requested_by: val.requested_by.trim(),
        approved_by: val.approved_by ? val.approved_by.trim() : undefined,
        request_date: val.request_date,
        expected_delivery: val.expected_delivery || undefined,
        total_amount: Number(val.total_amount),
        status: val.status,
        invoice_number: val.invoice_number ? val.invoice_number.trim() : undefined,
        remarks: val.remarks ? val.remarks.trim() : undefined
      };

      this.procurementService.createProcurement(createPayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/procurement']);
        },
        error: (err) => {
          console.error('Creation failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to create procurement request. Please verify fields.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/procurement']);
  }
}