import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-suspended',
  standalone: false,
  template: `
    <div class="suspended-page">
      <!-- Logo -->
      <div class="suspended-page__logo">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
          <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
          <text x="16" y="14" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
        </svg>
        <span class="logo-text"><span class="logo-hul">HUL</span><span class="logo-supply">Supply</span></span>
      </div>

      <!-- Shield icon with X animation -->
      <div class="suspended-page__icon">
        <svg class="shield-svg" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#ef4444" stroke-width="3" opacity="0.2"/>
          <circle class="shield-circle" cx="40" cy="40" r="36" fill="none" stroke="#ef4444" stroke-width="3"
            stroke-dasharray="226" stroke-dashoffset="226" stroke-linecap="round"/>
          <line class="shield-x1" x1="28" y1="28" x2="52" y2="52" stroke="#ef4444" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="34" stroke-dashoffset="34"/>
          <line class="shield-x2" x1="52" y1="28" x2="28" y2="52" stroke="#ef4444" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="34" stroke-dashoffset="34"/>
        </svg>
      </div>

      <h1 class="suspended-page__title">Account Suspended</h1>
      <p class="suspended-page__body">
        Your account has been suspended by an administrator.
        You are no longer able to access the dealer portal or place orders.
      </p>

      <!-- Info card -->
      <div class="suspended-page__card">
        <div class="card-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>If you believe this is a mistake, please contact your account manager or reach out to our support team.</span>
        </div>
        <div class="card-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span>support&#64;hulsupply.com</span>
        </div>
      </div>

      <a routerLink="/auth/login" class="suspended-page__link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to sign in
      </a>
    </div>
  `,
  styles: [`
    .suspended-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 24px;
      text-align: center;
      background: var(--bg-base);
    }

    .suspended-page__logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }

    .logo-text { font-family: var(--font-display); font-size: 20px; font-weight: 600; }
    .logo-hul { color: var(--text-primary); }
    .logo-supply { color: var(--hul-primary); }

    .suspended-page__icon { margin-bottom: 24px; }

    .shield-svg { overflow: visible; }
    .shield-circle { animation: drawCircle 0.8s ease-out 0.2s forwards; }
    .shield-x1 { animation: drawLine 0.4s ease-out 0.8s forwards; }
    .shield-x2 { animation: drawLine 0.4s ease-out 1.0s forwards; }

    @keyframes drawCircle { to { stroke-dashoffset: 0; } }
    @keyframes drawLine { to { stroke-dashoffset: 0; } }

    .suspended-page__title {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 700;
      color: var(--hul-danger);
      margin: 0 0 12px;
    }

    .suspended-page__body {
      font-size: 15px;
      color: var(--text-tertiary);
      max-width: 440px;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .suspended-page__card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      max-width: 440px;
      width: 100%;
      margin-bottom: 28px;
      text-align: left;
    }

    .card-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .card-row svg { flex-shrink: 0; margin-top: 2px; color: var(--text-tertiary); }

    .suspended-page__link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--hul-primary);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: color var(--duration-fast) var(--ease-out);
    }

    .suspended-page__link:hover { color: var(--hul-primary-hover); }

    @media (max-width: 640px) {
      .suspended-page__card { padding: 16px; }
    }
  `]
})
export class AccountSuspendedComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}
}
