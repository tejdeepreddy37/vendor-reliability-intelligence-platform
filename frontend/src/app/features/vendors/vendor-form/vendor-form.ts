import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VendorService } from '../../../core/services/vendor';

@Component({
  selector: 'app-vendor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './vendor-form.html',
  styleUrl: './vendor-form.scss'
})
export class VendorForm implements OnInit {

  private vendorService = inject(VendorService);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  isEdit = false;
  vendorId = 0;
  loading = false;
  submitting = false;
  errorMessage = '';

  vendorForm: FormGroup = this.fb.group({
    company_name: ['', [Validators.required, Validators.maxLength(150)]],
    contact_person: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    address: ['', [Validators.required]],
    category: ['', [Validators.required]],
    status: ['Pending'],
    is_active: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEdit = true;
      this.vendorId = Number(id);
      this.loading = true;

      this.vendorService
        .getVendorById(this.vendorId)
        .subscribe({
          next: (data) => {
            this.vendorForm.patchValue({
              company_name: data.company_name,
              contact_person: data.contact_person,
              email: data.email,
              phone: data.phone,
              address: data.address,
              category: data.category,
              status: data.status || 'Pending',
              is_active: data.is_active !== undefined ? data.is_active : true
            });
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.errorMessage = err.error?.detail || 'Failed to load vendor details';
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) {
      this.vendorForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    const formValue = this.vendorForm.value;

    if (this.isEdit) {
      this.vendorService
        .updateVendor(this.vendorId, formValue)
        .subscribe({
          next: () => {
            this.submitting = false;
            this.router.navigate(['/vendors']);
          },
          error: (err) => {
            this.submitting = false;
            this.errorMessage = err.error?.detail || 'Failed to update vendor. Please verify the input values.';
            this.cdr.markForCheck();
          }
        });
    } else {
      this.vendorService
        .createVendor(formValue)
        .subscribe({
          next: () => {
            this.submitting = false;
            this.router.navigate(['/vendors']);
          },
          error: (err) => {
            this.submitting = false;
            this.errorMessage = err.error?.detail || 'Failed to register vendor. Please check if the email already exists.';
            this.cdr.markForCheck();
          }
        });
    }
  }
}

