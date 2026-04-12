import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { Router } from '@angular/router';
import { DecodedToken, LoginResponse, RegisterDealerDto, UserRole } from '../models/user.model';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Access token is intentionally in-memory only for stronger XSS posture.
  private accessToken: string | null = null;
  private currentRole: UserRole | null = null;
  private currentUserName: string | null = null;
  private refreshInFlight$: Observable<LoginResponse> | null = null;

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(API_ENDPOINTS.auth.login(), { email, password }, { withCredentials: true })
      .pipe(
        map(response => this.normalizeAuthResponse(response)),
        tap(response => {
          if (response.accessToken) {
            this.storeToken(response);
          }
        })
      );
  }

  verifyLoginOtp(email: string, otp: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(API_ENDPOINTS.auth.loginVerifyOtp(), { email, otp }, { withCredentials: true })
      .pipe(
        map(response => this.normalizeAuthResponse(response)),
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

  refreshToken(): Observable<LoginResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<LoginResponse>(API_ENDPOINTS.auth.refresh(), {}, { withCredentials: true })
      .pipe(
        map(response => this.normalizeAuthResponse(response)),
        tap(response => {
          if (response.accessToken) {
            this.storeToken(response);
          }
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1)
      );

    return this.refreshInFlight$;
  }

  logout(): void {
    this.http.post(API_ENDPOINTS.auth.logout(), {}, { withCredentials: true }).subscribe({
      next: () => { },
      error: () => { }
    });

    this.accessToken = null;
    this.currentRole = null;
    this.currentUserName = null;
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getDecodedToken(): DecodedToken | null {
    const token = this.getAccessToken();
    if (!token) return null;

    return this.decodeToken(token);
  }

  getUserRole(): UserRole | null {
    const decodedRole = this.normalizeRoleValue(this.getDecodedToken()?.role);
    return decodedRole ?? this.currentRole;
  }

  getUserName(): string | null {
    return this.getDecodedToken()?.fullName ?? this.currentUserName;
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
    this.accessToken = response.accessToken;
    this.currentRole = this.normalizeRoleValue(response.role);
    this.currentUserName = response.fullName || null;
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    return this.refreshToken().pipe(
      map(response => !!response.accessToken && this.isAuthenticated()),
      catchError(() => of(false))
    );
  }

  private normalizeAuthResponse(response: unknown): LoginResponse {
    const payload = ((response as any)?.data ?? response) as any;

    return {
      accessToken: payload?.accessToken ?? payload?.AccessToken ?? '',
      expiresInSeconds: payload?.expiresInSeconds ?? payload?.ExpiresInSeconds ?? 0,
      refreshToken: payload?.refreshToken ?? payload?.RefreshToken ?? null,
      role: payload?.role ?? payload?.Role ?? payload?.userRole ?? payload?.UserRole ?? '',
      fullName: payload?.fullName ?? payload?.FullName ?? '',
      userId: payload?.userId ?? payload?.UserId ?? '',
    };
  }

  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
      const decoded = JSON.parse(atob(normalizedPayload));
      const rawRole =
        decoded.role
        || decoded.roles
        || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'];
      let primaryRole = rawRole;
      if (Array.isArray(rawRole)) {
        if (rawRole.includes('SuperAdmin')) primaryRole = 'SuperAdmin';
        else if (rawRole.includes('Admin')) primaryRole = 'Admin';
        else primaryRole = rawRole[0];
      }
      const normalizedRole = this.normalizeRoleValue(primaryRole);

      return {
        sub: decoded.sub || decoded.nameid,
        email: decoded.email,
        role: normalizedRole as UserRole,
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

  private normalizeRoleValue(rawRole: unknown): UserRole | null {
    if (!rawRole || typeof rawRole !== 'string') {
      return null;
    }

    const normalized = rawRole.trim().toLowerCase().replace(/[_\-\s]+/g, '');

    switch (normalized) {
      case 'superadmin':
        return UserRole.SuperAdmin;
      case 'admin':
        return UserRole.Admin;
      case 'dealer':
        return UserRole.Dealer;
      case 'deliveryagent':
      case 'agent':
        return UserRole.DeliveryAgent;
      default:
        return null;
    }
  }
}
