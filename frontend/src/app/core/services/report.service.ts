import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Report } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/reports';

  getAllReports(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
  }

  getReportById(id: number): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/${id}`);
  }

  createReport(report: Partial<Report>): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, report);
  }

  generateReport(reportType: string, fileFormat: string = 'CSV'): Observable<Report> {
    return this.http.post<Report>(
      `${this.apiUrl}/generate?report_type=${encodeURIComponent(reportType)}&file_format=${encodeURIComponent(fileFormat)}`,
      {}
    );
  }

  exportReportCsv(reportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportId}/export?format=CSV`, {
      responseType: 'blob',
    });
  }

  exportReportFile(reportId: number, format: string = 'CSV'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportId}/export?format=${encodeURIComponent(format)}`, {
      responseType: 'blob',
    });
  }

  exportAnalyticsCsv(category: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-csv?category=${encodeURIComponent(category)}`, {
      responseType: 'blob',
    });
  }

  exportAnalyticsExcel(category: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-excel?category=${encodeURIComponent(category)}`, {
      responseType: 'blob',
    });
  }

  exportAnalyticsPdf(category: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-pdf?category=${encodeURIComponent(category)}`, {
      responseType: 'blob',
    });
  }

  updateReport(id: number, report: Partial<Report>): Observable<Report> {
    return this.http.put<Report>(`${this.apiUrl}/${id}`, report);
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}