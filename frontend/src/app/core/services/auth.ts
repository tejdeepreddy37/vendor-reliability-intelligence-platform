import { Injectable, inject } from '@angular/core';

import { LoginRequest } from '../models/login.model';
import { RegisterRequest } from '../models/register.model';
import { Token } from '../models/token.model';
import { User } from '../models/user.model';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  private readonly authService = inject(AuthService);

  login(data: LoginRequest) {
    return this.authService.login(data);
  }

  register(data: RegisterRequest) {
    return this.authService.register(data);
  }

  me() {
    return this.authService.getCurrentUser();
  }

  saveToken(token: string): void {
    this.authService.saveToken(token);
  }

  getToken(): string | null {
    return this.authService.getToken();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
  }
}