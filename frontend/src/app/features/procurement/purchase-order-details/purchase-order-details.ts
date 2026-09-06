import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { Vendor } from '../../../core/models/vendor.model';
import { Procurement } from '../../../core/models/procurement.model';
import { PurchaseOrderService } from '../../../core/services/purchase-order.service';
import { VendorService } from '../../../core/services/vendor';
import { ProcurementService } from '../../../core/services/procurement';

@Component({
  selector: 'app-purchase-order-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase-order-details.html',
  styleUrls: ['./purchase-order-details.scss']
})
export class PurchaseOrderDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchaseOrderService = inject(PurchaseOrderService);
  private vendorService = inject(VendorService);
  private procurementService = inject(ProcurementService);
  private cdr = inject(ChangeDetectorRef);

  po: PurchaseOrder | null = null;
  vendor: Vendor | null = null;
  procurement: Procurement | null = null;

  loading = true;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadDetails(+idParam);
    } else {
      this.errorMessage = 'No purchase order ID specified.';
      this.loading = false;
    }
  }

  loadDetails(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.purchaseOrderService.getPurchaseOrderById(id).subscribe({
      next: (po) => {
        this.po = po;
        this.loadRelatedData(po);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading PO details', err);
        this.errorMessage = 'Failed to load purchase order details from database.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadRelatedData(po: PurchaseOrder): void {
    if (po.vendor_id) {
      this.vendorService.getVendorById(po.vendor_id).subscribe({
        next: (v) => {
          this.vendor = v;
          this.cdr.markForCheck();
        },
        error: (err) => console.warn('Could not load associated vendor', err)
      });
    }

    if (po.procurement_id) {
      this.procurementService.getProcurementById(po.procurement_id).subscribe({
        next: (p) => {
          this.procurement = p;
          this.cdr.markForCheck();
        },
        error: (err) => console.warn('Could not load associated procurement', err)
      });
    }
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed' || s === 'approved') return 'status-delivered';
    if (s === 'in transit' || s === 'shipped') return 'status-transit';
    if (s === 'ordered' || s === 'pending') return 'status-ordered';
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

  updateStatus(newStatus: string): void {
    if (!this.po?.id) return;
    this.actionLoading = true;

    this.purchaseOrderService.updatePurchaseOrder(this.po.id, { status: newStatus }).subscribe({
      next: (updated) => {
        if (this.po) {
          this.po.status = updated.status;
        }
        this.actionLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error updating status', err);
        alert('Failed to update status.');
        this.actionLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  editOrder(): void {
    if (this.po?.id) {
      this.router.navigate(['/purchase-orders/edit', this.po.id]);
    }
  }

  deleteOrder(): void {
    if (!this.po?.id) return;
    if (!confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      return;
    }

    this.purchaseOrderService.deletePurchaseOrder(this.po.id).subscribe({
      next: () => {
        this.router.navigate(['/purchase-orders']);
      },
      error: (err) => {
        console.error('Error deleting purchase order', err);
        alert('Failed to delete purchase order.');
        this.cdr.markForCheck();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/purchase-orders']);
  }
}