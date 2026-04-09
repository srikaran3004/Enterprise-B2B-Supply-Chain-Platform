import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthLayoutComponent } from './layout/auth-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { VerifyOtpComponent } from './pages/verify-otp/verify-otp.component';
import { LoginOtpComponent } from './pages/login-otp/login-otp.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { PendingApprovalComponent } from './pages/pending-approval/pending-approval.component';
import { AccountSuspendedComponent } from './pages/account-suspended/account-suspended.component';
import { OtpInputComponent } from './components/otp-input/otp-input.component';
import { PasswordStrengthComponent } from './components/password-strength/password-strength.component';

const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'register/verify-otp', component: VerifyOtpComponent },
      { path: 'login/verify-otp', component: LoginOtpComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
    ]
  },
  { path: 'pending-approval', component: PendingApprovalComponent },
  { path: 'account-suspended', component: AccountSuspendedComponent },
];

@NgModule({
  declarations: [
    AuthLayoutComponent,
    LoginComponent,
    RegisterComponent,
    VerifyOtpComponent,
    LoginOtpComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    PendingApprovalComponent,
    AccountSuspendedComponent,
    OtpInputComponent,
    PasswordStrengthComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class AuthModule { }
