import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { OtpInputComponent } from '../../components/otp-input/otp-input.component';

@Component({
  selector: 'app-reset-password',
  standalone: false,
  template: `
    <div class="reset-page">
      <h2 class="auth-title">Reset your password</h2>
      <p class="auth-subtitle">Enter the OTP sent to <strong>{{ email }}</strong> and your new password</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
        <div class="otp-section">
          <label class="field-label">Verification Code</label>
          <app-otp-input #otpInput [length]="6" [hasError]="hasOtpError"
            (completed)="onOtpComplete($event)"></app-otp-input>
        </div>

        <div class="form-group">
          <hul-input label="New Password" type="password" prefixIcon="lock" formControlName="newPassword"
            [required]="true" [error]="getFieldError('newPassword')" placeholder="Min. 8 characters"></hul-input>
          <app-password-strength [password]="form.get('newPassword')?.value || ''"></app-password-strength>
        </div>

        <div class="form-group">
          <hul-input label="Confirm Password" type="password" prefixIcon="lock" formControlName="confirmPassword"
            [required]="true" [error]="getFieldError('confirmPassword')" placeholder="Confirm your password"></hul-input>
        </div>

        <div *ngIf="errorMessage" class="server-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ errorMessage }}
        </div>

        <hul-button type="submit" variant="primary" size="lg" [fullWidth]="true"
          [loading]="loading" [disabled]="loading || otpValue.length < 6">
          Reset Password
        </hul-button>
      </form>
    </div>
  `,
  styles: [`
    .reset-page { width: 100%; }
    .auth-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .auth-subtitle { font-size: 15px; color: var(--text-tertiary); margin: 0 0 32px; }
    .auth-subtitle strong { color: var(--text-primary); }
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { width: 100%; }
    .otp-section { margin-bottom: 8px; }
    .field-label { display: block; font-size: 14px; font-weight: 500; color: var(--text-secondary); margin-bottom: 10px; font-family: var(--font-body); }
    .server-error { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md); color: var(--hul-danger); font-size: 14px; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  @ViewChild('otpInput') otpInput!: OtpInputComponent;

  form: FormGroup;
  email = '';
  otpValue = '';
  loading = false;
  hasOtpError = false;
  errorMessage = '';
  submitted = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private toast: ToastService) {
    const nav = this.router.getCurrentNavigation();
    this.email = nav?.extras?.state?.['email'] || '';

    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    if (!this.email) this.email = history.state?.email || '';
    if (!this.email) { this.router.navigate(['/auth/forgot-password']); }
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  onOtpComplete(otp: string): void { this.otpValue = otp; }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control || (!control.touched && !this.submitted)) return '';
    if (control.hasError('required')) return `${field === 'newPassword' ? 'New password' : 'Confirmation'} is required`;
    if (control.hasError('minlength')) return 'Must be at least 8 characters';
    if (field === 'confirmPassword' && this.form.hasError('mismatch')) return 'Passwords do not match';
    return '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid || this.otpValue.length < 6) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.authService.resetPassword(this.email, this.otpValue, this.form.value.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Password reset successfully. Please sign in.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        this.hasOtpError = true;
        this.errorMessage = err.error?.error || 'Invalid OTP or reset failed';
        this.otpInput?.shake();
      }
    });
  }
}
