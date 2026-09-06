import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PurchaseOrder,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto
} from '../models/purchase-order.model';

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
  private http = inject(HttpClient);

  private readonly API_URL = 'http://127.0.0.1:8000/purchase-orders';

  getAllPurchaseOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(this.API_URL);
  }

  getPurchaseOrderById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.API_URL}/${id}`);
  }

  createPurchaseOrder(data: CreatePurchaseOrderDto | PurchaseOrder): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.API_URL, data);
  }

  updatePurchaseOrder(id: number, data: UpdatePurchaseOrderDto | Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.API_URL}/${id}`, data);
  }

  deletePurchaseOrder(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }
}
