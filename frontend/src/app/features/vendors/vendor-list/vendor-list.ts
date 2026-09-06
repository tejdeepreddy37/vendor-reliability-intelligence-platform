import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Vendor } from '../../../core/models/vendor.model';
import { VendorService } from '../../../core/services/vendor';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-list.html',
  styleUrl: './vendor-list.scss'
})
export class VendorList implements OnInit {
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  vendors: Vendor[] = [];
  selectedVendor: Vendor | null = null;
  loading = false;
  actionLoading = false;
  errorMessage = '';

  searchTerm = '';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.loading = true;
    this.errorMessage = '';

    this.vendorService.getAllVendors().subscribe({
      next: (data) => {
        this.vendors = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading vendors', err);
        this.errorMessage = err.error?.detail || 'Unable to load vendors from database. Please verify backend connection.';
        this.loading = false;
        this.vendors = [];
        this.cdr.markForCheck();
      }
    });
  }

  get filteredVendors(): Vendor[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.vendors.filter((vendor) => {
      const matchesSearch =
        !search ||
        String(vendor.contact_person ?? '').toLowerCase().includes(search) ||
        String(vendor.company_name ?? '').toLowerCase().includes(search) ||
        String(vendor.email ?? '').toLowerCase().includes(search) ||
        String(vendor.phone ?? '').toLowerCase().includes(search) ||
        String(vendor.address ?? '').toLowerCase().includes(search) ||
        String(vendor.category ?? '').toLowerCase().includes(search);

      const status = String(vendor.status ?? '').trim().toLowerCase();

      const matchesStatus =
        this.statusFilter === 'all' ||
        status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get activeCount(): number {
    return this.vendors.filter((vendor) => {
      const status = String(vendor.status ?? '').trim().toLowerCase();
      return vendor.is_active === true || status === 'active' || status === 'approved';
    }).length;
  }

  get pendingCount(): number {
    return this.vendors.filter((vendor) => {
      const status = String(vendor.status ?? '').trim().toLowerCase();
      return status === 'pending';
    }).length;
  }

  getInitials(name: string | undefined): string {
    if (!name) {
      return 'VR';
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0] || 'V').toUpperCase();
  }

  getStatusClass(status: string | undefined): string {
    const normalized = String(status ?? '')
      .trim()
      .toLowerCase();

    if (normalized === 'active' || normalized === 'approved') {
      return 'status-active';
    }

    if (normalized === 'pending') {
      return 'status-pending';
    }

    if (normalized === 'inactive' || normalized === 'rejected' || normalized === 'suspended') {
      return 'status-inactive';
    }

    return 'status-neutral';
  }

  viewDetails(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedVendor = null;
    this.cdr.markForCheck();
  }

  addVendor(): void {
    this.router.navigate(['/vendors/add']);
  }

  editVendor(id: number): void {
    this.router.navigate(['/vendors/edit', id]);
  }

  changeStatus(vendor: Vendor, newStatus: string): void {
    if (!vendor.id) return;

    this.actionLoading = true;
    const updatedPayload: Vendor = {
      ...vendor,
      status: newStatus,
      is_active: newStatus === 'Active'
    };

    this.vendorService.updateVendor(vendor.id, updatedPayload).subscribe({
      next: (res) => {
        this.actionLoading = false;
        if (this.selectedVendor && this.selectedVendor.id === vendor.id) {
          this.selectedVendor = { ...this.selectedVendor, status: newStatus, is_active: newStatus === 'Active' };
        }
        this.loadVendors();
      },
      error: (err) => {
        this.actionLoading = false;
        alert(err.error?.detail || 'Failed to update vendor status');
        this.cdr.markForCheck();
      }
    });
  }

  deleteVendor(id: number): void {
    if (confirm('Are you sure you want to delete this vendor? This will remove the record from PostgreSQL.')) {
      this.actionLoading = true;
      this.vendorService.deleteVendor(id).subscribe({
        next: () => {
          this.actionLoading = false;
          if (this.selectedVendor && this.selectedVendor.id === id) {
            this.selectedVendor = null;
          }
          this.loadVendors();
        },
        error: (err) => {
          this.actionLoading = false;
          alert(err.error?.detail || 'Failed to delete vendor');
          this.cdr.markForCheck();
        }
      });
    }
  }
}