import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  template: `
    <div class="forgot-page">
      <h2 class="auth-title">Forgot password?</h2>
      <p class="auth-subtitle">Enter your registered email to receive an OTP</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
        <div class="form-group">
          <hul-input label="Email address" type="email" prefixIcon="mail" formControlName="email"
            [required]="true" [error]="getFieldError('email')" placeholder="dealer@company.com"></hul-input>
        </div>

        <hul-button type="submit" variant="primary" size="lg" [fullWidth]="true"
          [loading]="loading" [disabled]="loading">
          Send Reset Code
        </hul-button>

        <a routerLink="/auth/login" class="auth-link" style="text-align: center;">← Back to sign in</a>
      </form>
    </div>
  `,
  styles: [`
    .forgot-page { width: 100%; }
    .auth-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .auth-subtitle { font-size: 15px; color: var(--text-tertiary); margin: 0 0 32px; }
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { width: 100%; }
    .auth-link { color: var(--hul-primary); font-size: 14px; font-weight: 600; text-decoration: none; }
    .auth-link:hover { color: var(--hul-primary-hover); }
  `]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  submitted = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private toast: ToastService) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control || (!control.touched && !this.submitted)) return '';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email';
    return '';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/reset-password'], { state: { email: this.form.value.email } });
        this.toast.success('Reset code sent to your email');
      },
      error: () => { this.loading = false; }
    });
  }
}
