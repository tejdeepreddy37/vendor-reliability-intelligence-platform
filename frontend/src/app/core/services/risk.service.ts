import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Risk, RiskCreateDto, RiskUpdateDto } from '../models/risk.model';

@Injectable({
  providedIn: 'root'
})
export class RiskService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/risks';

  getAllRisks(): Observable<Risk[]> {
    return this.http.get<Risk[]>(this.apiUrl);
  }

  getRiskById(id: number): Observable<Risk> {
    return this.http.get<Risk>(`${this.apiUrl}/${id}`);
  }

  getRisksByVendor(vendorId: number): Observable<Risk[]> {
    return this.http.get<Risk[]>(`${this.apiUrl}/vendor/${vendorId}`);
  }

  createRisk(risk: RiskCreateDto | Risk): Observable<Risk> {
    return this.http.post<Risk>(this.apiUrl, risk);
  }

  updateRisk(id: number, risk: RiskUpdateDto | Partial<Risk>): Observable<Risk> {
    return this.http.put<Risk>(`${this.apiUrl}/${id}`, risk);
  }

  deleteRisk(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}