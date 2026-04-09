import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: false,
  template: `
    <div class="unauth">
      <div class="unauth__bg-number">403</div>
      <div class="unauth__content">
        <div class="unauth__logo">
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#0369a1"/><path d="M16 20l8-8 8 8M16 28l8 8 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="unauth__brand">HUL<span class="unauth__brand-accent">Supply</span></span>
        </div>
        <h1 class="unauth__title">Access Restricted</h1>
        <p class="unauth__message">
          You don't have permission to view this page.<br>
          Contact your administrator if you think this is a mistake.
        </p>
        <div class="unauth__actions">
          <button class="unauth__btn unauth__btn--outline" (click)="goBack()">Go Back</button>
          <button class="unauth__btn unauth__btn--primary" (click)="goToDashboard()">Return to Dashboard</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauth {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg-base); position: relative; overflow: hidden; padding: 24px;
    }
    .unauth__bg-number {
      position: absolute; font-size: 280px; font-weight: 900; font-family: var(--font-display);
      color: var(--border-default); opacity: .15; user-select: none; z-index: 0;
    }
    .unauth__content {
      position: relative; z-index: 1; text-align: center; max-width: 480px;
      animation: slideUp 400ms var(--ease-out);
    }
    .unauth__logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 32px; }
    .unauth__brand { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .unauth__brand-accent { color: var(--hul-primary); }
    .unauth__title { font-size: 32px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; font-family: var(--font-display); }
    .unauth__message { font-size: 16px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 32px; }
    .unauth__actions { display: flex; gap: 12px; justify-content: center; }
    .unauth__btn {
      padding: 12px 28px; border-radius: var(--radius-lg); font-size: 15px; font-weight: 600;
      font-family: var(--font-body); cursor: pointer; transition: all var(--duration-fast) var(--ease-out);
    }
    .unauth__btn--outline {
      background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary);
    }
    .unauth__btn--outline:hover { background: var(--bg-muted); }
    .unauth__btn--primary {
      background: var(--hul-primary); border: none; color: white;
    }
    .unauth__btn--primary:hover { background: var(--hul-primary-hover); }
  `]
})
export class UnauthorizedPageComponent {
  constructor(private router: Router, private authService: AuthService) {}

  goBack(): void { history.back(); }
  goToDashboard(): void { this.router.navigate([this.authService.getRoleDashboardRoute()]); }
}
