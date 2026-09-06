import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ContractService } from '../../../core/services/contract';
import { VendorService } from '../../../core/services/vendor';
import { Contract } from '../../../core/models/contract.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-contract-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contract-details.html',
  styleUrl: './contract-details.scss'
})
export class ContractDetails implements OnInit {
  private contractService = inject(ContractService);
  private vendorService = inject(VendorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  contract: Contract | null = null;
  vendor: Vendor | null = null;

  loading = true;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadContract(Number(idParam));
    } else {
      this.errorMessage = 'No contract ID specified.';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  loadContract(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.contractService.getContractById(id).subscribe({
      next: (data) => {
        this.contract = data;
        if (data.vendor_id) {
          this.loadVendor(data.vendor_id);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching contract details:', err);
        this.errorMessage = 'Could not load contract details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadVendor(vendorId: number): void {
    this.vendorService.getVendorById(vendorId).subscribe({
      next: (v) => {
        this.vendor = v;
        this.cdr.markForCheck();
      },
      error: (err) => console.warn('Could not load associated vendor', err)
    });
  }

  isExpiringSoon(endDateStr: string | undefined): boolean {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    const difference = endDate.getTime() - today.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return difference >= 0 && difference <= thirtyDays;
  }

  isExpired(endDateStr: string | undefined): boolean {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    return endDate.getTime() < today.setHours(0, 0, 0, 0);
  }

  getStatusClass(status: string | undefined, endDateStr: string | undefined): string {
    const s = (status || 'Active').toLowerCase();
    if (s === 'terminated' || s === 'cancelled') return 'status-terminated';
    if (s === 'expired' || this.isExpired(endDateStr)) return 'status-expired';
    if (this.isExpiringSoon(endDateStr) && s === 'active') return 'status-expiring';
    if (s === 'active') return 'status-active';
    if (s === 'pending' || s === 'draft' || s === 'under_review') return 'status-pending';
    return 'status-neutral';
  }

  updateStatus(newStatus: string): void {
    if (!this.contract?.id) return;
    this.actionLoading = true;

    this.contractService.updateContract(this.contract.id, { status: newStatus }).subscribe({
      next: (updated) => {
        if (this.contract) {
          this.contract.status = updated.status;
        }
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating status', err);
        alert('Failed to update contract status.');
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  editContract(): void {
    if (this.contract?.id) {
      this.router.navigate(['/contracts/edit', this.contract.id]);
    }
  }

  deleteContract(): void {
    if (!this.contract?.id) return;

    if (!confirm(`Are you sure you want to delete contract ${this.contract.contract_number}? This action cannot be undone.`)) {
      return;
    }

    this.contractService.deleteContract(this.contract.id).subscribe({
      next: () => {
        this.router.navigate(['/contracts']);
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Failed to delete contract.');
        this.cdr.markForCheck();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/contracts']);
  }
}