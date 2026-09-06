import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authService.currentUser$;
  showMenu = false;

  toggleUserMenu(): void {
    this.showMenu = !this.showMenu;
  }

  closeUserMenu(): void {
    this.showMenu = false;
  }

  logout(): void {
    this.showMenu = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string): void {
    this.showMenu = false;
    this.router.navigate([path]);
  }
}