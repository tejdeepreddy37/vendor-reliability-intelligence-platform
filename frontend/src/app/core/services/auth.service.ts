import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

import { LoginRequest } from '../models/login.model';
import { RegisterRequest } from '../models/register.model';
import { Token } from '../models/token.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly API_URL = 'http://127.0.0.1:8000/auth';

  private readonly currentUserSubject = new BehaviorSubject<User | null>(
    this.getStoredUser()
  );

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (this.isLoggedIn() && !this.currentUserSubject.value) {
      this.fetchCurrentUser().subscribe();
    }
  }

  login(data: LoginRequest): Observable<Token> {
    return this.http.post<Token>(
      `${this.API_URL}/login`,
      data
    ).pipe(
      tap((response: Token) => {
        this.saveToken(response.access_token);
        this.fetchCurrentUser().subscribe();
      })
    );
  }

  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(
      `${this.API_URL}/register`,
      data
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(
      `${this.API_URL}/me`
    ).pipe(
      tap((user: User) => {
        this.saveUser(user);
      })
    );
  }

  fetchCurrentUser(): Observable<User | null> {
    if (!this.isLoggedIn()) {
      this.currentUserSubject.next(null);
      return of(null);
    }
    return this.getCurrentUser().pipe(
      catchError(() => {
        return of(this.getStoredUser());
      })
    );
  }

  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      return (Date.now() / 1000) >= payload.exp;
    } catch {
      return true;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();

    if (!token || !token.trim() || token === 'undefined' || token === 'null') {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  saveUser(user: User): void {
    localStorage.setItem(
      'user',
      JSON.stringify(user)
    );
    this.currentUserSubject.next(user);
  }

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  clearSession(): void {
    this.logout();
  }

  getUserInitials(fullName?: string | null): string {
    if (!fullName || !fullName.trim()) {
      return 'U';
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getRoleDisplayName(role?: string | null): string {
    if (!role) {
      return 'User';
    }
    const r = role.toLowerCase();
    if (r === 'admin' || r === 'administrator') return 'Administrator';
    if (r === 'procurement manager' || r === 'procurement_manager') return 'Procurement Manager';
    if (r === 'supply chain manager' || r === 'supply_chain_manager') return 'Supply Chain Manager';
    if (r === 'vendor' || r === 'vendor user') return 'Vendor';
    if (r === 'finance officer' || r === 'finance_officer') return 'Finance Officer';
    if (r === 'auditor') return 'Auditor';
    if (r === 'vendor manager') return 'Vendor Manager';
    return role;
  }
}