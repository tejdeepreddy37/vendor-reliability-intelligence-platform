import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ContractService } from '../../../core/services/contract';
import { VendorService } from '../../../core/services/vendor';
import { Contract } from '../../../core/models/contract.model';
import { Vendor } from '../../../core/models/vendor.model';

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-list.html',
  styleUrl: './contract-list.scss'
})
export class ContractList implements OnInit {
  private contractService = inject(ContractService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  contracts: Contract[] = [];
  expiringContracts: Contract[] = [];
  vendors: Vendor[] = [];
  vendorMap = new Map<number, Vendor>();

  loading = true;
  errorMessage = '';
  actionLoading = false;

  searchTerm = '';
  statusFilter = 'all';
  showOnlyExpiring = false;

  selectedContract: Contract | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      contracts: this.contractService.getAllContracts(),
      expiring: this.contractService.getExpiringContracts(30),
      vendors: this.vendorService.getAllVendors()
    }).subscribe({
      next: ({ contracts, expiring, vendors }) => {
        this.contracts = Array.isArray(contracts) ? contracts : [];
        this.expiringContracts = Array.isArray(expiring) ? expiring : [];
        this.vendors = Array.isArray(vendors) ? vendors : [];

        this.vendorMap.clear();
        for (const v of this.vendors) {
          if (v.id != null) {
            this.vendorMap.set(v.id, v);
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load contract records:', err);
        this.errorMessage = 'Could not load contract records from database. Please retry.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredContracts(): Contract[] {
    return this.contracts.filter((contract) => {
      const vendorName = this.getVendorName(contract).toLowerCase();
      const title = (contract.contract_title || contract.contract_name || '').toLowerCase();
      const num = (contract.contract_number || '').toLowerCase();
      const status = (contract.status || 'Active').toLowerCase();

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        num.includes(term) ||
        title.includes(term) ||
        vendorName.includes(term) ||
        status.includes(term);

      let matchesFilter = true;
      if (this.showOnlyExpiring) {
        matchesFilter = this.isExpiringSoon(contract.end_date) && status === 'active';
      } else if (this.statusFilter === 'expiring') {
        matchesFilter = this.isExpiringSoon(contract.end_date) && status === 'active';
      } else if (this.statusFilter !== 'all') {
        matchesFilter = status === this.statusFilter.toLowerCase();
      }

      return matchesSearch && matchesFilter;
    });
  }

  get totalContractValue(): number {
    return this.contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  }

  get activeContractsCount(): number {
    return this.contracts.filter((c) => (c.status || '').toLowerCase() === 'active').length;
  }

  get expiringCount(): number {
    return this.expiringContracts.length;
  }

  getVendor(vendorId: number): Vendor | undefined {
    return this.vendorMap.get(vendorId);
  }

  getVendorName(contract: Contract): string {
    const v = this.vendorMap.get(contract.vendor_id);
    return v?.company_name || v?.contact_person || `Vendor #${contract.vendor_id}`;
  }

  getVendorCategory(vendorId: number): string {
    const v = this.vendorMap.get(vendorId);
    return v?.category || 'General Supply';
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'CT';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  isExpiringSoon(endDateStr: string): boolean {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    const difference = endDate.getTime() - today.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return difference >= 0 && difference <= thirtyDays;
  }

  isExpired(endDateStr: string): boolean {
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    return endDate.getTime() < today.setHours(0, 0, 0, 0);
  }

  getStatusClass(status: string | undefined, endDateStr: string): string {
    const s = (status || 'Active').toLowerCase();
    if (s === 'terminated' || s === 'cancelled') return 'status-terminated';
    if (s === 'expired' || this.isExpired(endDateStr)) return 'status-expired';
    if (this.isExpiringSoon(endDateStr) && s === 'active') return 'status-expiring';
    if (s === 'active') return 'status-active';
    if (s === 'pending' || s === 'draft' || s === 'under_review') return 'status-pending';
    return 'status-neutral';
  }

  toggleExpiringFilter(): void {
    this.showOnlyExpiring = !this.showOnlyExpiring;
    this.cdr.markForCheck();
  }

  navigateToCreate(): void {
    this.router.navigate(['/contracts/add']);
  }

  editContract(id: number): void {
    this.router.navigate(['/contracts/edit', id]);
  }

  viewDetails(contract: Contract): void {
    this.selectedContract = contract;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedContract = null;
    this.cdr.markForCheck();
  }

  updateContractStatus(contract: Contract, newStatus: string): void {
    if (contract.id == null) return;
    this.actionLoading = true;

    this.contractService.updateContract(contract.id, { status: newStatus }).subscribe({
      next: (updated) => {
        contract.status = updated.status;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating contract status', err);
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteContract(event: Event, id: number): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    this.contractService.deleteContract(id).subscribe({
      next: () => {
        if (this.selectedContract?.id === id) {
          this.selectedContract = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting contract:', err);
        alert('Failed to delete contract.');
        this.cdr.markForCheck();
      }
    });
  }
}