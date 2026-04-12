import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-login',
  standalone: false,
  template: `
    <div class="login-page">
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-subtitle">Sign in to your HUL Supply account</p>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
        <div class="form-group">
          <hul-input
            label="Email address"
            type="email"
            prefixIcon="mail"
            formControlName="email"
            [required]="true"
            [error]="getFieldError('email')"
            placeholder="dealer@company.com">
          </hul-input>
        </div>

        <div class="form-group">
          <hul-input
            label="Password"
            type="password"
            prefixIcon="lock"
            formControlName="password"
            [required]="true"
            [error]="getFieldError('password')"
            placeholder="Enter your password">
          </hul-input>
        </div>

        <div *ngIf="serverError" class="server-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ serverError }}
        </div>

        <hul-button
          type="submit"
          variant="primary"
          size="lg"
          [fullWidth]="true"
          [loading]="loading"
          [disabled]="loading">
          Sign In
        </hul-button>

        <a routerLink="/auth/forgot-password" class="auth-link auth-link--forgot">
          Forgot password?
        </a>

        <div class="auth-footer">
          <span class="auth-footer__text">New dealer?</span>
          <a routerLink="/auth/register" class="auth-link">Register your business →</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-page { width: 100%; }

    .auth-title {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 6px;
    }

    .auth-subtitle {
      font-size: 15px;
      color: var(--text-tertiary);
      margin: 0 0 32px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group { width: 100%; }

    .server-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-md);
      color: var(--hul-danger);
      font-size: 14px;
      font-family: var(--font-body);
    }

    .auth-link {
      color: var(--hul-primary);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: color var(--duration-fast) var(--ease-out);
    }

    .auth-link:hover { color: var(--hul-primary-hover); }

    .auth-link--forgot {
      text-align: center;
      margin-top: -8px;
    }

    .auth-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding-top: 16px;
      border-top: 1px solid var(--border-default);
    }

    .auth-footer__text {
      font-size: 14px;
      color: var(--text-tertiary);
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  serverError = '';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  getFieldError(field: string): string {
    const control = this.loginForm.get(field);
    if (!control || (!control.touched && !this.submitted)) return '';
    if (control.hasError('required')) return `${field === 'email' ? 'Email' : 'Password'} is required`;
    if (control.hasError('email')) return 'Please enter a valid email address';
    if (control.hasError('minlength')) return 'Password must be at least 6 characters';
    return '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.accessToken) {
          if (!this.authService.isAuthenticated()) {
            this.serverError = 'Login response did not contain a valid token. Please try again.';
            return;
          }

          const route = this.authService.getRoleDashboardRoute();
          if (route === '/auth/login') {
            this.serverError = 'Unable to determine your account role. Please contact support.';
            return;
          }

          this.router.navigate([route]);
          this.toast.success(`Welcome back, ${response.fullName}!`);
        } else {
          this.router.navigate(['/auth/login/verify-otp'], {
            state: { email }
          });
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || '';
        if (errorMsg.toLowerCase().includes('suspended')) {
          this.router.navigate(['/auth/account-suspended']);
        } else if (errorMsg.toLowerCase().includes('pending')) {
          this.router.navigate(['/auth/pending-approval'], { state: { email } });
        } else if (errorMsg.toLowerCase().includes('rejected')) {
          this.serverError = 'Your account registration was rejected. Please contact support.';
        } else if (err.status === 401) {
          this.serverError = errorMsg || 'Invalid email or password.';
        } else {
          this.serverError = errorMsg || 'Something went wrong. Please try again.';
        }
      }
    });
  }
}
