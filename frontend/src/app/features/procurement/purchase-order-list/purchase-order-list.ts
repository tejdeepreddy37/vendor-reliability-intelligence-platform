import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Procurement } from '../../../core/models/procurement.model';
import { PurchaseOrderService } from '../../../core/services/purchase-order.service';
import { VendorService } from '../../../core/services/vendor';
import { ProcurementService } from '../../../core/services/procurement';

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-order-list.html',
  styleUrls: ['./purchase-order-list.scss']
})
export class PurchaseOrderList implements OnInit {
  private purchaseOrderService = inject(PurchaseOrderService);
  private vendorService = inject(VendorService);
  private procurementService = inject(ProcurementService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  purchaseOrders: PurchaseOrder[] = [];
  vendors: Vendor[] = [];
  procurements: Procurement[] = [];

  vendorMap = new Map<number, Vendor>();
  procurementMap = new Map<number, Procurement>();

  loading = false;
  errorMessage = '';
  searchTerm = '';
  statusFilter = 'all';

  selectedPo: PurchaseOrder | null = null;
  actionLoading = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      pos: this.purchaseOrderService.getAllPurchaseOrders(),
      vendors: this.vendorService.getVendors(),
      procurements: this.procurementService.getAllProcurements()
    }).subscribe({
      next: ({ pos, vendors, procurements }) => {
        this.purchaseOrders = Array.isArray(pos) ? pos : [];
        this.vendors = Array.isArray(vendors) ? vendors : [];
        this.procurements = Array.isArray(procurements) ? procurements : [];

        this.vendorMap.clear();
        for (const v of this.vendors) {
          if (v.id != null) {
            this.vendorMap.set(v.id, v);
          }
        }

        this.procurementMap.clear();
        for (const p of this.procurements) {
          if (p.id != null) {
            this.procurementMap.set(p.id, p);
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading purchase orders or related data', err);
        this.errorMessage = 'Failed to load purchase orders from database. Please retry.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredPurchaseOrders(): PurchaseOrder[] {
    return this.purchaseOrders.filter((po) => {
      const vendor = this.vendorMap.get(po.vendor_id);
      const vendorName = vendor?.company_name || vendor?.contact_person || '';
      const proc = this.procurementMap.get(po.procurement_id);
      const procTitle = proc?.title || proc?.request_number || '';

      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        po.po_number.toLowerCase().includes(term) ||
        vendorName.toLowerCase().includes(term) ||
        procTitle.toLowerCase().includes(term) ||
        (po.status || '').toLowerCase().includes(term) ||
        (po.payment_status || '').toLowerCase().includes(term) ||
        (po.remarks || '').toLowerCase().includes(term);

      const status = (po.status || '').toLowerCase();
      const matchesStatus =
        this.statusFilter === 'all' ||
        status === this.statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }

  get totalValue(): number {
    return this.purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  }

  get activeCount(): number {
    return this.purchaseOrders.filter((po) => {
      const s = (po.status || '').toLowerCase();
      return s === 'ordered' || s === 'in transit' || s === 'pending' || s === 'shipped';
    }).length;
  }

  get deliveredCount(): number {
    return this.purchaseOrders.filter((po) => {
      const s = (po.status || '').toLowerCase();
      return s === 'delivered' || s === 'completed';
    }).length;
  }

  get pendingCount(): number {
    return this.purchaseOrders.filter((po) => {
      const s = (po.status || '').toLowerCase();
      return s === 'pending' || s === 'cancelled' || s === 'rejected';
    }).length;
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'PO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getVendor(vendorId: number): Vendor | undefined {
    return this.vendorMap.get(vendorId);
  }

  getVendorName(vendorId: number): string {
    const v = this.vendorMap.get(vendorId);
    return v?.company_name || v?.contact_person || `Vendor #${vendorId}`;
  }

  getVendorCategory(vendorId: number): string {
    const v = this.vendorMap.get(vendorId);
    return v?.category || 'General Supply';
  }

  getProcurement(procId: number): Procurement | undefined {
    return this.procurementMap.get(procId);
  }

  getProcurementLabel(procId: number): string {
    const p = this.procurementMap.get(procId);
    return p ? `${p.request_number} (${p.title})` : `PR #${procId}`;
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed' || s === 'approved') return 'status-delivered';
    if (s === 'in transit' || s === 'shipped') return 'status-transit';
    if (s === 'ordered') return 'status-ordered';
    if (s === 'pending') return 'status-pending';
    if (s === 'cancelled' || s === 'rejected') return 'status-cancelled';
    return 'status-neutral';
  }

  getPaymentStatusClass(status: string | undefined): string {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'paid') return 'pay-completed';
    if (s === 'partial') return 'pay-partial';
    if (s === 'pending') return 'pay-pending';
    if (s === 'overdue') return 'pay-overdue';
    return 'pay-neutral';
  }

  createPo(): void {
    this.router.navigate(['/purchase-orders/add']);
  }

  editPo(id: number): void {
    this.router.navigate(['/purchase-orders/edit', id]);
  }

  viewDetails(po: PurchaseOrder): void {
    this.selectedPo = po;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedPo = null;
    this.cdr.markForCheck();
  }

  updatePoStatus(po: PurchaseOrder, newStatus: string): void {
    if (po.id == null) return;
    this.actionLoading = true;

    this.purchaseOrderService.updatePurchaseOrder(po.id, { status: newStatus }).subscribe({
      next: (updated) => {
        po.status = updated.status;
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating PO status', err);
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  delete(id: number): void {
    if (!confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      return;
    }

    this.purchaseOrderService.deletePurchaseOrder(id).subscribe({
      next: () => {
        if (this.selectedPo?.id === id) {
          this.selectedPo = null;
        }
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting purchase order', err);
        alert('Failed to delete purchase order.');
        this.cdr.markForCheck();
      }
    });
  }
}