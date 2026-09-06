import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PurchaseOrderService } from '../../../core/services/purchase-order.service';
import { VendorService } from '../../../core/services/vendor';
import { ProcurementService } from '../../../core/services/procurement';
import { Vendor } from '../../../core/models/vendor.model';
import { Procurement } from '../../../core/models/procurement.model';

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './purchase-order-form.html',
  styleUrl: './purchase-order-form.scss'
})
export class PurchaseOrderForm implements OnInit {
  private fb = inject(FormBuilder);
  private purchaseOrderService = inject(PurchaseOrderService);
  private vendorService = inject(VendorService);
  private procurementService = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  poForm!: FormGroup;
  isEditMode = false;
  poId: number | null = null;

  vendors: Vendor[] = [];
  procurements: Procurement[] = [];

  loading = false;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  private initForm(): void {
    const today = new Date().toISOString().substring(0, 10);

    this.poForm = this.fb.group({
      po_number: ['', [Validators.required, Validators.maxLength(50)]],
      vendor_id: [null, [Validators.required]],
      procurement_id: [null, [Validators.required]],
      order_date: [today, [Validators.required]],
      expected_delivery: [''],
      total_amount: [null, [Validators.required, Validators.min(0.01)]],
      status: ['Ordered', [Validators.required]],
      payment_status: ['Pending', [Validators.required]],
      remarks: ['', [Validators.maxLength(500)]]
    });
  }

  private checkEditMode(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    this.loading = true;
    forkJoin({
      vendors: this.vendorService.getVendors(),
      procurements: this.procurementService.getAllProcurements()
    }).subscribe({
      next: ({ vendors, procurements }) => {
        this.vendors = Array.isArray(vendors) ? vendors : [];
        this.procurements = Array.isArray(procurements) ? procurements : [];

        if (idParam) {
          this.isEditMode = true;
          this.poId = +idParam;
          this.loadPoData(this.poId);
        } else {
          // Auto-select first vendor/procurement if available for convenience
          if (this.vendors.length > 0 && !this.poForm.get('vendor_id')?.value) {
            this.poForm.patchValue({ vendor_id: this.vendors[0].id });
          }
          if (this.procurements.length > 0 && !this.poForm.get('procurement_id')?.value) {
            this.poForm.patchValue({ procurement_id: this.procurements[0].id });
          }
          // Suggest a default PO number based on timestamp
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          this.poForm.patchValue({
            po_number: `PO-${new Date().getFullYear()}-${randomSuffix}`
          });

          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Error loading vendors or procurements', err);
        this.errorMessage = 'Failed to load vendor directory or procurement records.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadPoData(id: number): void {
    this.purchaseOrderService.getPurchaseOrderById(id).subscribe({
      next: (po) => {
        this.poForm.patchValue({
          po_number: po.po_number,
          vendor_id: po.vendor_id,
          procurement_id: po.procurement_id,
          order_date: po.order_date,
          expected_delivery: po.expected_delivery || '',
          total_amount: po.total_amount,
          status: po.status || 'Ordered',
          payment_status: po.payment_status || 'Pending',
          remarks: po.remarks || ''
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading PO', err);
        this.errorMessage = 'Failed to load purchase order details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.poForm.invalid) {
      this.poForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const formVal = this.poForm.value;
    const payload = {
      po_number: formVal.po_number.trim(),
      vendor_id: Number(formVal.vendor_id),
      procurement_id: Number(formVal.procurement_id),
      order_date: formVal.order_date,
      expected_delivery: formVal.expected_delivery ? formVal.expected_delivery : null,
      total_amount: Number(formVal.total_amount),
      status: formVal.status,
      payment_status: formVal.payment_status,
      remarks: formVal.remarks ? formVal.remarks.trim() : null
    };

    if (this.isEditMode && this.poId != null) {
      this.purchaseOrderService.updatePurchaseOrder(this.poId, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/purchase-orders']);
        },
        error: (err) => {
          console.error('Error updating PO', err);
          this.errorMessage = err.error?.detail || 'Failed to update purchase order. Please try again.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.purchaseOrderService.createPurchaseOrder(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/purchase-orders']);
        },
        error: (err) => {
          console.error('Error creating PO', err);
          this.errorMessage = err.error?.detail || 'Failed to create purchase order. Please verify input fields.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/purchase-orders']);
  }
}