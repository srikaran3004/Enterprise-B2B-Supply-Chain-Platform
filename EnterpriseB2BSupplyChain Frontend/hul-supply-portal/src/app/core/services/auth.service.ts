import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { DecodedToken, LoginRequest, LoginResponse, RegisterDealerDto, UserRole } from '../models/user.model';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'hul_access_token';
  private readonly ROLE_KEY = 'hul_user_role';
  private readonly NAME_KEY = 'hul_user_name';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.auth.login(), { email, password }).pipe(
      tap(response => {
        if (response.accessToken) {
          this.storeToken(response);
        }
      })
    );
  }

  verifyLoginOtp(email: string, otp: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.auth.loginVerifyOtp(), { email, otp }).pipe(
      tap(response => {
        if (response.accessToken) {
          this.storeToken(response);
        }
      })
    );
  }

  register(dto: RegisterDealerDto): Observable<{ userId: string; message: string }> {
    return this.http.post<{ userId: string; message: string }>(API_ENDPOINTS.auth.register(), dto);
  }

  verifyRegistrationOtp(email: string, otp: string): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.registerVerifyOtp(), { email, otp });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.forgotPassword(), { email });
  }

  resetPassword(email: string, otp: string, newPassword: string): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.forgotPasswordReset(), { email, otp, newPassword });
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.NAME_KEY);
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getDecodedToken(): DecodedToken | null {
    const token = this.getAccessToken();
    if (!token) return null;

    return this.decodeToken(token);
  }

  getUserRole(): UserRole | null {
    const decodedRole = this.getDecodedToken()?.role;
    if (decodedRole) {
      localStorage.setItem(this.ROLE_KEY, decodedRole);
      return decodedRole as UserRole;
    }

    const role = localStorage.getItem(this.ROLE_KEY);
    return role ? (role as UserRole) : null;
  }

  getUserName(): string | null {
    const decodedName = this.getDecodedToken()?.fullName;
    if (decodedName) {
      localStorage.setItem(this.NAME_KEY, decodedName);
      return decodedName;
    }

    return localStorage.getItem(this.NAME_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    const decoded = this.getDecodedToken();
    if (!decoded) return false;
    return decoded.exp * 1000 > Date.now();
  }

  getDealerId(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.dealerId || null;
  }

  getRoleDashboardRoute(): string {
    const role = this.getUserRole();
    switch (role) {
      case UserRole.Dealer:
        return '/dealer/dashboard';
      case UserRole.Admin:
        return '/admin/dashboard';
      case UserRole.SuperAdmin:
        return '/super-admin/dashboard';
      case UserRole.DeliveryAgent:
        return '/agent/deliveries';
      default:
        return '/auth/login';
    }
  }

  private storeToken(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);

    const decoded = this.decodeToken(response.accessToken);
    localStorage.setItem(this.ROLE_KEY, decoded?.role || response.role);
    localStorage.setItem(this.NAME_KEY, decoded?.fullName || response.fullName);
  }

  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
      const decoded = JSON.parse(atob(normalizedPayload));
      const rawRole = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      let primaryRole = rawRole;
      if (Array.isArray(rawRole)) {
        if (rawRole.includes('SuperAdmin')) primaryRole = 'SuperAdmin';
        else if (rawRole.includes('Admin')) primaryRole = 'Admin';
        else primaryRole = rawRole[0];
      }

      return {
        sub: decoded.sub || decoded.nameid,
        email: decoded.email,
        role: primaryRole,
        fullName: decoded.fullName || decoded.unique_name,
        dealerId: decoded.dealerId,
        jti: decoded.jti,
        exp: decoded.exp,
        businessName: decoded.businessName,
        gstNumber: decoded.gstNumber,
        phoneNumber: decoded.phoneNumber,
        addressLine1: decoded.addressLine1,
        city: decoded.city,
        state: decoded.state,
        pinCode: decoded.pinCode,
        profilePictureUrl: decoded.profilePictureUrl
      };
    } catch {
      return null;
    }
  }
}
