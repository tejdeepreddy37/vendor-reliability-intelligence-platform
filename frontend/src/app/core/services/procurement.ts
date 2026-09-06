import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Procurement } from '../models/procurement.model';

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {

  private http = inject(HttpClient);

  private readonly API_URL = 'http://127.0.0.1:8000/procurements';

  getAllProcurements(): Observable<Procurement[]> {
    return this.http.get<Procurement[]>(this.API_URL);
  }

  getProcurementById(id: number): Observable<Procurement> {
    return this.http.get<Procurement>(`${this.API_URL}/${id}`);
  }

  createProcurement(procurement: Procurement): Observable<Procurement> {
    return this.http.post<Procurement>(
      this.API_URL,
      procurement
    );
  }

  updateProcurement(
    id: number,
    procurement: Partial<Procurement>
  ): Observable<Procurement> {
    return this.http.put<Procurement>(
      `${this.API_URL}/${id}`,
      procurement
    );
  }

  deleteProcurement(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  approveProcurement(id: number, approvedBy: string): Observable<Procurement> {
    return this.http.put<Procurement>(
      `${this.API_URL}/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`,
      {}
    );
  }

  rejectProcurement(id: number, rejectedBy: string): Observable<Procurement> {
    return this.http.put<Procurement>(
      `${this.API_URL}/${id}/reject?rejected_by=${encodeURIComponent(rejectedBy)}`,
      {}
    );
  }

}