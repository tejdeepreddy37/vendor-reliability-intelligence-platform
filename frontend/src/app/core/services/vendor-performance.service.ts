import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  VendorPerformance,
  VendorPerformanceCreateDto,
  VendorPerformanceUpdateDto
} from '../models/vendor-performance.model';

@Injectable({
  providedIn: 'root'
})
export class VendorPerformanceService {

  private http = inject(HttpClient);

  private readonly API_URL = 'http://127.0.0.1:8000/vendor-performance';

  // Get All Vendor Performance
  getAllVendorPerformance(): Observable<VendorPerformance[]> {
    return this.http.get<VendorPerformance[]>(
      this.API_URL
    );
  }

  // Get Performance By ID
  getVendorPerformanceById(
    performanceId: number
  ): Observable<VendorPerformance> {
    return this.http.get<VendorPerformance>(
      `${this.API_URL}/${performanceId}`
    );
  }

  // Get Performance By Vendor ID
  getVendorPerformanceByVendorId(
    vendorId: number
  ): Observable<VendorPerformance> {
    return this.http.get<VendorPerformance>(
      `${this.API_URL}/vendor/${vendorId}`
    );
  }

  // Create Performance
  createVendorPerformance(
    performance: VendorPerformanceCreateDto | VendorPerformance
  ): Observable<VendorPerformance> {
    return this.http.post<VendorPerformance>(
      this.API_URL,
      performance
    );
  }

  // Update Performance
  updateVendorPerformance(
    performanceId: number,
    performance: VendorPerformanceUpdateDto | Partial<VendorPerformance>
  ): Observable<VendorPerformance> {
    return this.http.put<VendorPerformance>(
      `${this.API_URL}/${performanceId}`,
      performance
    );
  }

  // Delete Performance
  deleteVendorPerformance(
    performanceId: number
  ): Observable<any> {

    return this.http.delete(
      `${this.API_URL}/${performanceId}`
    );

  }

}