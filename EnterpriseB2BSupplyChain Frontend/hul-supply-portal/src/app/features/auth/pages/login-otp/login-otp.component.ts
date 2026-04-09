import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { OtpInputComponent } from '../../components/otp-input/otp-input.component';

@Component({
  selector: 'app-login-otp',
  standalone: false,
  template: `
    <div class="otp-page">
      <h2 class="auth-title">Two-factor authentication</h2>
      <p class="auth-subtitle">Enter the code sent to <strong>{{ email }}</strong> to complete sign in</p>

      <div class="otp-form">
        <app-otp-input #otpInput [length]="6" [hasError]="hasError"
          (completed)="onOtpComplete($event)"></app-otp-input>

        <div *ngIf="errorMessage" class="otp-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ errorMessage }}
        </div>

        <div class="otp-timer">
          <span *ngIf="countdown > 0" class="otp-timer__text">Resend code in {{ formatTime(countdown) }}</span>
          <button *ngIf="countdown <= 0" class="otp-timer__resend" (click)="resendOtp()" [disabled]="resending">
            {{ resending ? 'Sending...' : 'Resend OTP' }}
          </button>
        </div>

        <hul-button variant="primary" size="lg" [fullWidth]="true" [loading]="loading"
          [disabled]="loading || otpValue.length < 6" (click)="verify()">
          Verify & Sign In
        </hul-button>
      </div>
    </div>
  `,
  styles: [`
    .otp-page { width: 100%; text-align: center; }
    .auth-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .auth-subtitle { font-size: 15px; color: var(--text-tertiary); margin: 0 0 36px; }
    .auth-subtitle strong { color: var(--text-primary); }
    .otp-form { display: flex; flex-direction: column; gap: 24px; }
    .otp-error { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--hul-danger); font-size: 14px; }
    .otp-timer { text-align: center; }
    .otp-timer__text { font-size: 14px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .otp-timer__resend { background: none; border: none; color: var(--hul-primary); font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .otp-timer__resend:hover { color: var(--hul-primary-hover); }
    .otp-timer__resend:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class LoginOtpComponent implements OnInit, OnDestroy {
  @ViewChild('otpInput') otpInput!: OtpInputComponent;

  email = '';
  otpValue = '';
  loading = false;
  resending = false;
  hasError = false;
  errorMessage = '';
  countdown = 45;
  private timer: any;

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) {
    const nav = this.router.getCurrentNavigation();
    this.email = nav?.extras?.state?.['email'] || '';
  }

  ngOnInit() {
    if (!this.email) this.email = history.state?.email || '';
    if (!this.email) { this.router.navigate(['/auth/login']); return; }
    this.startTimer();
  }

  ngOnDestroy() { clearInterval(this.timer); }

  onOtpComplete(otp: string): void { this.otpValue = otp; }

  verify(): void {
    if (this.otpValue.length < 6) return;
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.authService.verifyLoginOtp(this.email, this.otpValue).subscribe({
      next: () => {
        this.loading = false;
        const route = this.authService.getRoleDashboardRoute();
        this.router.navigate([route]);
        this.toast.success('Welcome back!');
      },
      error: () => {
        this.loading = false;
        this.hasError = true;
        this.errorMessage = 'Invalid or expired OTP';
        this.otpInput?.shake();
      }
    });
  }

  resendOtp(): void {
    this.resending = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: () => { this.resending = false; this.countdown = 45; this.startTimer(); this.toast.success('OTP sent!'); },
      error: () => { this.resending = false; this.toast.error('Failed to resend OTP'); }
    });
  }

  formatTime(s: number): string { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

  private startTimer(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => { this.countdown--; if (this.countdown <= 0) clearInterval(this.timer); }, 1000);
  }
}
