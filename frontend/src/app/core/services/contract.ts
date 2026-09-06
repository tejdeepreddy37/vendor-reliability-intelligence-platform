import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Contract,
  ContractCreateDto,
  ContractUpdateDto
} from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/contracts';

  getAllContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(this.apiUrl);
  }

  getContractById(id: number): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${id}`);
  }

  getExpiringContracts(days: number = 30): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/expiring?days=${days}`);
  }

  getContractsByVendor(vendorId: number): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/vendor/${vendorId}`);
  }

  createContract(contract: ContractCreateDto | Contract): Observable<Contract> {
    return this.http.post<Contract>(this.apiUrl, contract);
  }

  updateContract(id: number, contract: ContractUpdateDto | Partial<Contract>): Observable<Contract> {
    return this.http.put<Contract>(`${this.apiUrl}/${id}`, contract);
  }

  deleteContract(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}