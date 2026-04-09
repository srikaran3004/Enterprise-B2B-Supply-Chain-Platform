import { Component } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-auth-layout',
  standalone: false,
  template: `
    <div class="auth-layout">
      <!-- Brand Panel (Left) -->
      <div class="auth-layout__brand">
        <div class="auth-layout__brand-content">
          <!-- Logo -->
          <div class="auth-layout__logo">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="white" opacity="0.9"/>
              <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
              <text x="16" y="14" text-anchor="middle" dominant-baseline="central" fill="#0c4a6e" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
            </svg>
            <span class="auth-layout__logo-text">
              <span style="color: white;">HUL</span><span style="color: #38bdf8;">Supply</span>
            </span>
          </div>

          <!-- Headline -->
          <h1 class="auth-layout__headline">Power your business.<br>One order at a time.</h1>
          <p class="auth-layout__subtext">India's trusted B2B wholesale distribution platform</p>

          <!-- Feature chips -->
          <div class="auth-layout__chips">
            <span class="auth-layout__chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              38+ Unilever brands
            </span>
            <span class="auth-layout__chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Live order tracking
            </span>
            <span class="auth-layout__chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              GST invoices
            </span>
          </div>
        </div>

        <!-- Decorative geometric pattern -->
        <div class="auth-layout__pattern"></div>
      </div>

      <!-- Form Panel (Right) -->
      <div class="auth-layout__form">
        <!-- Theme toggle -->
        <button class="auth-layout__theme-toggle" (click)="toggleTheme()" [title]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg *ngIf="!themeService.isDark()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg *ngIf="themeService.isDark()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>

        <div class="auth-layout__form-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout {
      display: flex;
      min-height: 100vh;
    }

    .auth-layout__brand {
      width: 45%;
      background: linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px;
      position: relative;
      overflow: hidden;
    }

    .auth-layout__brand-content {
      position: relative;
      z-index: 2;
    }

    .auth-layout__pattern {
      position: absolute;
      inset: 0;
      opacity: 0.05;
      background-image:
        linear-gradient(30deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
        linear-gradient(150deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
        linear-gradient(30deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
        linear-gradient(150deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
        linear-gradient(60deg, rgba(255,255,255,.4) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,.4) 75%, rgba(255,255,255,.4)),
        linear-gradient(60deg, rgba(255,255,255,.4) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,.4) 75%, rgba(255,255,255,.4));
      background-size: 80px 140px;
      background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
      z-index: 1;
    }

    .auth-layout__logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 48px;
    }

    .auth-layout__logo-text {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
    }

    .auth-layout__headline {
      font-family: var(--font-display);
      font-size: 40px;
      font-weight: 700;
      color: white;
      line-height: 1.15;
      margin: 0 0 16px;
    }

    .auth-layout__subtext {
      font-size: 17px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 40px;
      line-height: 1.5;
    }

    .auth-layout__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .auth-layout__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      font-weight: 500;
    }

    .auth-layout__form {
      width: 55%;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      position: relative;
      overflow-y: auto;
    }

    .auth-layout__theme-toggle {
      position: absolute;
      top: 20px;
      right: 20px;
      background: var(--bg-muted);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 8px;
      cursor: pointer;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
      z-index: 10;
    }

    .auth-layout__theme-toggle:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    .auth-layout__form-content {
      width: 100%;
      max-width: 420px;
      animation: slideUp 400ms var(--ease-out);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .auth-layout {
        flex-direction: column;
      }
      .auth-layout__brand {
        width: 100%;
        padding: 28px 24px;
      }
      .auth-layout__headline {
        font-size: 24px;
      }
      .auth-layout__subtext {
        margin-bottom: 20px;
        font-size: 14px;
      }
      .auth-layout__chips {
        display: none;
      }
      .auth-layout__form {
        width: 100%;
        padding: 32px 24px;
        flex: 1;
      }
    }
  `]
})
export class AuthLayoutComponent {
  constructor(public themeService: ThemeService) {}

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
