import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ContractService } from '../../../core/services/contract';
import { VendorService } from '../../../core/services/vendor';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './contract-form.html',
  styleUrl: './contract-form.scss'
})
export class ContractForm implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  contractForm!: FormGroup;
  isEditMode = false;
  contractId: number | null = null;

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
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const defaultEnd = nextYear.toISOString().substring(0, 10);

    this.contractForm = this.fb.group({
      contract_number: ['', [Validators.required, Validators.maxLength(50)]],
      vendor_id: [null, [Validators.required]],
      contract_name: ['', [Validators.required, Validators.maxLength(255)]],
      start_date: [today, [Validators.required]],
      end_date: [defaultEnd, [Validators.required]],
      contract_value: [null, [Validators.required, Validators.min(0.01)]],
      status: ['Active', [Validators.required]],
      terms_conditions: ['', [Validators.maxLength(1000)]]
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
          this.contractId = Number(idParam);
          this.loadExistingContract(this.contractId);
        } else {
          // Pre-select first active vendor if available
          if (this.vendors.length > 0 && !this.contractForm.get('vendor_id')?.value) {
            this.contractForm.patchValue({ vendor_id: this.vendors[0].id });
          }
          // Suggest a default contract number
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          this.contractForm.patchValue({
            contract_number: `CNT-${new Date().getFullYear()}-${randomSuffix}`
          });
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

  private loadExistingContract(id: number): void {
    this.contractService.getContractById(id).subscribe({
      next: (contract) => {
        this.contractForm.patchValue({
          contract_number: contract.contract_number,
          vendor_id: contract.vendor_id,
          contract_name: contract.contract_title || contract.contract_name || '',
          contract_value: contract.contract_value,
          start_date: contract.start_date ? contract.start_date.substring(0, 10) : '',
          end_date: contract.end_date ? contract.end_date.substring(0, 10) : '',
          status: contract.status || 'Active',
          terms_conditions: contract.terms_conditions || contract.description || ''
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading contract:', err);
        this.errorMessage = 'Could not load contract details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const val = this.contractForm.value;

    if (this.isEditMode && this.contractId !== null) {
      const updatePayload = {
        contract_name: val.contract_name.trim(),
        end_date: val.end_date,
        contract_value: Number(val.contract_value),
        status: val.status,
        description: val.terms_conditions ? val.terms_conditions.trim() : null
      };

      this.contractService.updateContract(this.contractId, updatePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/contracts']);
        },
        error: (err) => {
          console.error('Update contract failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to update contract agreement.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      const createPayload = {
        contract_number: val.contract_number.trim(),
        vendor_id: Number(val.vendor_id),
        contract_name: val.contract_name.trim(),
        start_date: val.start_date,
        end_date: val.end_date,
        contract_value: Number(val.contract_value),
        currency: 'INR',
        description: val.terms_conditions ? val.terms_conditions.trim() : null
      };

      this.contractService.createContract(createPayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/contracts']);
        },
        error: (err) => {
          console.error('Creation failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to create contract agreement. Please verify fields.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/contracts']);
  }
}