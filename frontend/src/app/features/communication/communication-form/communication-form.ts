import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommunicationService } from '../../../core/services/communication';
import { VendorService } from '../../../core/services/vendor';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-communication-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './communication-form.html',
  styleUrls: ['./communication-form.scss']
})
export class CommunicationForm implements OnInit {
  private fb = inject(FormBuilder);
  private communicationService = inject(CommunicationService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  commForm!: FormGroup;
  isEditMode = false;
  commId: number | null = null;

  vendors: Vendor[] = [];

  loading = true;
  submitting = false;
  errorMessage = '';

  communicationTypes: string[] = [
    'Email',
    'Call',
    'Meeting',
    'Notice',
    'Inquiry'
  ];

  statusOptions: string[] = [
    'Sent',
    'Pending',
    'Draft',
    'Archived'
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadVendorsAndCheckMode();
  }

  private initForm(): void {
    this.commForm = this.fb.group({
      vendor_id: [null, [Validators.required]],
      communication_type: ['Email', [Validators.required]],
      subject: ['', [Validators.required, Validators.maxLength(255)]],
      message: ['', [Validators.required, Validators.maxLength(2000)]],
      status: ['Sent', [Validators.required]]
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
          this.commId = Number(idParam);
          this.loadExistingCommunication(this.commId);
        } else {
          // Pre-select first vendor if available
          if (this.vendors.length > 0 && !this.commForm.get('vendor_id')?.value) {
            this.commForm.patchValue({ vendor_id: this.vendors[0].id });
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

  private loadExistingCommunication(id: number): void {
    this.communicationService.getCommunicationById(id).subscribe({
      next: (comm) => {
        this.commForm.patchValue({
          vendor_id: comm.vendor_id,
          communication_type: comm.communication_type,
          subject: comm.subject,
          message: comm.message,
          status: comm.status || 'Sent'
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading communication:', err);
        this.errorMessage = 'Could not load communication record from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.commForm.invalid) {
      this.commForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const val = this.commForm.value;

    if (this.isEditMode && this.commId !== null) {
      const updatePayload = {
        vendor_id: Number(val.vendor_id),
        communication_type: val.communication_type,
        subject: val.subject.trim(),
        message: val.message.trim(),
        status: val.status
      };

      this.communicationService.updateCommunication(this.commId, updatePayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/communications']);
        },
        error: (err) => {
          console.error('Update communication failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to update communication log.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      const createPayload = {
        vendor_id: Number(val.vendor_id),
        communication_type: val.communication_type,
        subject: val.subject.trim(),
        message: val.message.trim(),
        status: val.status
      };

      this.communicationService.createCommunication(createPayload).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/communications']);
        },
        error: (err) => {
          console.error('Create communication failed:', err);
          this.errorMessage = err?.error?.detail || 'Failed to record communication. Please check inputs.';
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/communications']);
  }
}