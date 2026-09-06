import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {
  @ViewChild('pageContent', { static: true }) pageContent?: ElementRef<HTMLElement>;
  private readonly router = inject(Router);
  private navSub?: Subscription;
  private popstateListener?: () => void;

  ngOnInit(): void {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      try {
        history.scrollRestoration = 'manual';
      } catch {
        // Ignore if restricted
      }
    }
    this.resetScroll();
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.resetScroll();
      });

    if (typeof window !== 'undefined') {
      this.popstateListener = () => {
        this.resetScroll();
      };
      window.addEventListener('popstate', this.popstateListener);
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    if (typeof window !== 'undefined' && this.popstateListener) {
      window.removeEventListener('popstate', this.popstateListener);
    }
  }

  private resetScroll(): void {
    const el = this.pageContent?.nativeElement || (typeof document !== 'undefined' ? document.querySelector('.page-content') as HTMLElement : null);
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      window.requestAnimationFrame(() => {
        const target = this.pageContent?.nativeElement || (typeof document !== 'undefined' ? document.querySelector('.page-content') as HTMLElement : null);
        if (target) {
          target.scrollTop = 0;
          target.scrollLeft = 0;
        }
      });
      setTimeout(() => {
        const target = this.pageContent?.nativeElement || (typeof document !== 'undefined' ? document.querySelector('.page-content') as HTMLElement : null);
        if (target) {
          target.scrollTop = 0;
          target.scrollLeft = 0;
        }
      }, 0);
    }
  }
}