import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DashboardSummary, SpendVelocityAnalytics } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private http = inject(HttpClient);

  private readonly API = 'http://127.0.0.1:8000/dashboard';

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(
      `${this.API}/summary`
    );
  }

  getSpendVelocity(year?: number): Observable<SpendVelocityAnalytics> {
    const params = year ? `?year=${year}` : '';
    return this.http.get<SpendVelocityAnalytics>(
      `${this.API}/spend-velocity${params}`
    );
  }

}