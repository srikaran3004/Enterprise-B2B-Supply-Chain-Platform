import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending-approval',
  standalone: false,
  template: `
    <div class="pending-page">
      <!-- Logo -->
      <div class="pending-page__logo">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
          <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
          <text x="16" y="14" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
        </svg>
        <span class="logo-text"><span class="logo-hul">HUL</span><span class="logo-supply">Supply</span></span>
      </div>

      <!-- Checkmark animation -->
      <div class="pending-page__check">
        <svg class="check-svg" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#10b981" stroke-width="3" opacity="0.2"/>
          <circle class="check-circle" cx="40" cy="40" r="36" fill="none" stroke="#10b981" stroke-width="3"
            stroke-dasharray="226" stroke-dashoffset="226" stroke-linecap="round"/>
          <polyline class="check-mark" points="26,42 36,52 54,30" fill="none" stroke="#10b981" stroke-width="3.5"
            stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/>
        </svg>
      </div>

      <h1 class="pending-page__title">Registration submitted!</h1>
      <p class="pending-page__body">
        Your account is pending review by our team. You'll receive an email at
        <strong>{{ email }}</strong> once approved. This usually takes 24–48 hours.
      </p>

      <!-- Steps -->
      <div class="pending-page__steps">
        <div class="step step--done">
          <div class="step__dot step__dot--filled">✓</div>
          <span class="step__label">Submitted</span>
        </div>
        <div class="step__line step__line--active"></div>
        <div class="step step--active">
          <div class="step__dot step__dot--pulse"></div>
          <span class="step__label">Under Review</span>
        </div>
        <div class="step__line"></div>
        <div class="step">
          <div class="step__dot"></div>
          <span class="step__label">Approved</span>
        </div>
        <div class="step__line"></div>
        <div class="step">
          <div class="step__dot"></div>
          <span class="step__label">Start Ordering</span>
        </div>
      </div>

      <a routerLink="/auth/login" class="pending-page__link">← Back to sign in</a>
    </div>
  `,
  styles: [`
    .pending-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 24px;
      text-align: center;
      background: var(--bg-base);
    }

    .pending-page__logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }

    .logo-text { font-family: var(--font-display); font-size: 20px; font-weight: 600; }
    .logo-hul { color: var(--text-primary); }
    .logo-supply { color: var(--hul-primary); }

    .pending-page__check {
      margin-bottom: 24px;
    }

    .check-svg {
      overflow: visible;
    }

    .check-circle {
      animation: drawCircle 0.8s ease-out 0.2s forwards;
    }

    .check-mark {
      animation: drawCheck 0.5s ease-out 0.8s forwards;
    }

    @keyframes drawCircle {
      to { stroke-dashoffset: 0; }
    }

    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }

    .pending-page__title {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px;
    }

    .pending-page__body {
      font-size: 15px;
      color: var(--text-tertiary);
      max-width: 420px;
      line-height: 1.6;
      margin: 0 0 36px;
    }

    .pending-page__body strong {
      color: var(--text-primary);
    }

    .pending-page__steps {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 36px;
      padding: 24px 32px;
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      flex-wrap: wrap;
      justify-content: center;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .step__dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-muted);
      border: 2px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-disabled);
    }

    .step__dot--filled {
      background: var(--hul-success);
      border-color: var(--hul-success);
      color: white;
    }

    .step__dot--pulse {
      background: var(--hul-primary-light);
      border-color: var(--hul-primary);
      position: relative;
    }

    .step__dot--pulse::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hul-primary);
      animation: pulse-dot 2s ease-in-out infinite;
    }

    .step__label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .step--done .step__label { color: var(--hul-success); }
    .step--active .step__label { color: var(--hul-primary); }

    .step__line {
      width: 40px;
      height: 2px;
      background: var(--border-default);
      margin: 0 4px;
      margin-bottom: 24px;
    }

    .step__line--active {
      background: var(--hul-success);
    }

    .pending-page__link {
      color: var(--hul-primary);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: color var(--duration-fast) var(--ease-out);
    }

    .pending-page__link:hover { color: var(--hul-primary-hover); }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.5); }
    }

    @media (max-width: 640px) {
      .pending-page__steps { padding: 16px; }
      .step__line { width: 20px; }
    }
  `]
})
export class PendingApprovalComponent implements OnInit {
  email = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.email = history.state?.email || 'your email';
  }
}
