import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NotificationService } from '../../../core/services/notification.service';
import { VendorService } from '../../../core/services/vendor';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-notification-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './notification-form.html',
  styleUrl: './notification-form.scss'
})
export class NotificationForm implements OnInit {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  notifForm!: FormGroup;
  vendors: Vendor[] = [];

  loadingVendors = false;
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.loadVendors();
  }

  private initForm(): void {
    this.notifForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      message: ['', [Validators.required, Validators.maxLength(2000)]],
      recipient: ['procurement@vrip.enterprise', [Validators.required, Validators.email]],
      notification_type: ['Procurement', [Validators.required]],
      status: ['Unread']
    });
  }

  private loadVendors(): void {
    this.loadingVendors = true;
    this.vendorService.getAllVendors().subscribe({
      next: (data) => {
        this.vendors = Array.isArray(data) ? data : [];
        this.loadingVendors = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not load vendors for autofill:', err);
        this.loadingVendors = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.notifForm.invalid) {
      this.notifForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload = this.notifForm.value;

    this.notificationService.createNotification(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/notifications']);
      },
      error: (err) => {
        console.error('Failed to create notification:', err);
        this.errorMessage = err?.error?.detail || 'Failed to dispatch alert notification.';
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/notifications']);
  }
}