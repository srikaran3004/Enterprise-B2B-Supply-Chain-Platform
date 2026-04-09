import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { INDIAN_STATES } from '../../../../shared/constants/order-status.constants';

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <div class="register-page">
      <h2 class="auth-title">Register your business</h2>
      <p class="auth-subtitle">Create a wholesale account to access 38+ Unilever brands</p>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
        <div class="form-group">
          <hul-input label="Full Name" type="text" prefixIcon="user" formControlName="fullName"
            [required]="true" [error]="getFieldError('fullName')" placeholder="Rajesh Kumar"></hul-input>
        </div>

        <div class="form-group">
          <hul-input label="Business Name" type="text" prefixIcon="building-2" formControlName="businessName"
            [required]="true" [error]="getFieldError('businessName')" placeholder="Kumar Wholesale Pvt Ltd"></hul-input>
        </div>

        <div class="form-group">
          <hul-input label="Email" type="email" prefixIcon="mail" formControlName="email"
            [required]="true" [error]="getFieldError('email')" placeholder="rajesh@company.com"></hul-input>
        </div>

        <div class="form-group">
          <hul-input label="Phone Number" type="tel" prefixIcon="phone" formControlName="phoneNumber"
            [required]="true" [error]="getFieldError('phoneNumber')" placeholder="9876543210"></hul-input>
        </div>

        <div class="form-group">
          <hul-input label="Password" type="password" prefixIcon="lock" formControlName="password"
            [required]="true" [error]="getFieldError('password')" placeholder="Min. 8 characters"></hul-input>
          <app-password-strength [password]="registerForm.get('password')?.value || ''"></app-password-strength>
        </div>

        <div class="form-group">
          <hul-input label="GST Number" type="text" prefixIcon="file-text" formControlName="gstNumber"
            [required]="true" [error]="getFieldError('gstNumber')" placeholder="29AABCK1234F1Z5"
            hint="15-character GST Identification Number"></hul-input>
        </div>

        <div class="form-group">
          <hul-input label="Address Line 1" type="text" prefixIcon="map-pin" formControlName="addressLine1"
            [required]="true" [error]="getFieldError('addressLine1')" placeholder="123 MG Road, Block A"></hul-input>
        </div>

        <div class="form-row">
          <div class="form-group form-group--half">
            <hul-input label="City" type="text" formControlName="city"
              [required]="true" [error]="getFieldError('city')" placeholder="Mumbai"></hul-input>
          </div>
          <div class="form-group form-group--half">
            <label class="select-label">State <span class="required">*</span></label>
            <select formControlName="state" class="select-input" [class.select-input--error]="getFieldError('state')">
              <option value="">Select state</option>
              <option *ngFor="let state of indianStates" [value]="state">{{ state }}</option>
            </select>
            <span *ngIf="getFieldError('state')" class="field-error">{{ getFieldError('state') }}</span>
          </div>
        </div>

        <div class="form-group">
          <hul-input label="PIN Code" type="text" formControlName="pinCode"
            [required]="true" [error]="getFieldError('pinCode')" placeholder="400001" [maxlength]="6"></hul-input>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="isInterstate" class="checkbox-input" />
            <span class="checkbox-text">This dealer operates across state borders (IGST applies)</span>
          </label>
        </div>

        <div *ngIf="serverError" class="server-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {{ serverError }}
        </div>

        <hul-button type="submit" variant="primary" size="lg" [fullWidth]="true"
          [loading]="loading" [disabled]="loading">
          Create Account
        </hul-button>

        <div class="auth-footer">
          <span class="auth-footer__text">Already have an account?</span>
          <a routerLink="/auth/login" class="auth-link">Sign In</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .register-page { width: 100%; }

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
      margin: 0 0 28px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group { width: 100%; }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-group--half { flex: 1; }

    .select-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 6px;
      font-family: var(--font-body);
    }

    .required { color: var(--hul-danger); margin-left: 2px; }

    .select-input {
      width: 100%;
      padding: 12px 14px;
      font-size: 15px;
      font-family: var(--font-body);
      color: var(--text-primary);
      background: var(--bg-base);
      border: 1.5px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color var(--duration-base) var(--ease-out);
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .select-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
    }

    .select-input--error {
      border-color: var(--hul-danger) !important;
    }

    .field-error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--hul-danger);
      font-size: 13px;
      margin-top: 6px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .checkbox-input {
      width: 18px;
      height: 18px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--border-strong);
      accent-color: var(--hul-primary);
      margin-top: 2px;
      flex-shrink: 0;
    }

    .checkbox-text {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

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
    }

    .auth-link {
      color: var(--hul-primary);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }

    .auth-link:hover { color: var(--hul-primary-hover); }

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
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  serverError = '';
  submitted = false;
  indianStates = INDIAN_STATES;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      businessName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      gstNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
      addressLine1: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      isInterstate: [false],
    });
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    if (!hasUpper || !hasNumber) {
      return { passwordStrength: true };
    }
    return null;
  }

  getFieldError(field: string): string {
    const control = this.registerForm.get(field);
    if (!control || (!control.touched && !this.submitted)) return '';
    if (control.hasError('required')) {
      const labels: Record<string, string> = {
        fullName: 'Full name', businessName: 'Business name', email: 'Email',
        phoneNumber: 'Phone number', password: 'Password', gstNumber: 'GST number',
        addressLine1: 'Address', city: 'City', state: 'State', pinCode: 'PIN code'
      };
      return `${labels[field] || field} is required`;
    }
    if (control.hasError('email')) return 'Please enter a valid email';
    if (control.hasError('minlength')) {
      const min = control.errors?.['minlength']?.requiredLength;
      return `Must be at least ${min} characters`;
    }
    if (control.hasError('pattern')) {
      if (field === 'phoneNumber') return 'Enter a valid 10-digit Indian mobile number';
      if (field === 'gstNumber') return 'Enter a valid 15-character GST number';
      if (field === 'pinCode') return 'PIN code must be exactly 6 digits';
    }
    if (control.hasError('passwordStrength')) return 'Must include uppercase letter and number';
    return '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const dto = { ...this.registerForm.value, tradeLicenseNumber: null };

    this.authService.register(dto).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/register/verify-otp'], {
          state: { email: dto.email }
        });
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          this.serverError = err.error?.error || 'Email or GST already registered';
        } else if (err.status === 400 && err.error?.errors) {
          this.serverError = err.error.errors.map((e: any) => e.errorMessage).join('. ');
        }
      }
    });
  }
}
