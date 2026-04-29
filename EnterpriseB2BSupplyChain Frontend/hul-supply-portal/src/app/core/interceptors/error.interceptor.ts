import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshAccessToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private toast: ToastService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Callers can set this header to suppress automatic error toasts (e.g. dashboard background calls)
    const silentHeader = req.headers.has('X-Skip-Error-Toast');
    // Strip the header before forwarding so the backend never sees it
    const forwardReq = silentHeader ? req.clone({ headers: req.headers.delete('X-Skip-Error-Toast') }) : req;
    return next.handle(forwardReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Skip showing errors for certain endpoints to avoid spam
        const skipErrorToast = silentHeader || req.url.includes('/my') || req.url.includes('/shipping-addresses');
        
        if (error.status === 0) {
          if (!skipErrorToast) this.toast.error('Unable to connect. Check your internet connection.');
        } else if (error.status === 401) {
          if (this.isAuthEndpoint(req.url) || req.headers.has('X-Refresh-Retry')) {
            if (!this.isLoginEndpoint(req.url)) {
              this.authService.logout();
              if (!skipErrorToast) {
                this.toast.error('Your session has expired. Please sign in again.');
              }
            }
            return throwError(() => error);
          }

          return this.handleUnauthorized(forwardReq, next, error, skipErrorToast);
        } else if (error.status === 403) {
          if (!skipErrorToast) this.toast.error("You don't have permission to perform this action.");
        } else if (error.status === 404) {
          // Only show 404 errors for non-optional resources
          if (!skipErrorToast && !req.url.includes('/shipping-addresses')) {
            this.toast.error('Resource not found.');
          }
        } else if (error.status === 409) {
          const message = this.extractErrorMessage(error) || 'Conflict detected.';
          this.toast.warning(message);
        } else if (error.status === 400) {
          // ── VALIDATION_FAILED: structured field-level errors from FluentValidation ──
          const errorCode: string | undefined = error.error?.error?.code ?? error.error?.errorCode;
          const validationErrors: { propertyName?: string; errorMessage: string }[] | undefined =
            error.error?.errors ?? error.error?.error?.details;

          if (errorCode === 'VALIDATION_FAILED' && validationErrors && Array.isArray(validationErrors)) {
            // Format as "Field: message" for each validation failure
            const messages = validationErrors
              .map(e => e.propertyName ? `${e.propertyName}: ${e.errorMessage}` : e.errorMessage)
              .join('\n');
            this.toast.error(messages);
          } else if (validationErrors && Array.isArray(validationErrors)) {
            // Fallback: errors array without explicit VALIDATION_FAILED code
            const messages = validationErrors.map(e => e.errorMessage || e).join('. ');
            this.toast.error(messages);
          } else {
            const message = this.extractErrorMessage(error);
            if (message) {
              this.toast.error(message);
            }
          }
        } else if (error.status >= 500) {
          if (!skipErrorToast) this.toast.error('Something went wrong. Please try again or contact support.');
        }
        return throwError(() => error);
      })
    );
  }

  private handleUnauthorized(
    req: HttpRequest<any>,
    next: HttpHandler,
    originalError: HttpErrorResponse,
    skipErrorToast: boolean
  ): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      return this.refreshAccessToken$.pipe(
        filter((token): token is string => !!token),
        take(1),
        switchMap(token => next.handle(this.withAccessToken(req, token, true)))
      );
    }

    this.isRefreshing = true;
    this.refreshAccessToken$.next(null);

    return this.authService.refreshToken().pipe(
      switchMap(response => {
        this.isRefreshing = false;
        this.refreshAccessToken$.next(response.accessToken);
        return next.handle(this.withAccessToken(req, response.accessToken, true));
      }),
      catchError(refreshError => {
        this.isRefreshing = false;
        this.refreshAccessToken$.next(null);
        this.authService.logout();
        if (!skipErrorToast) {
          this.toast.error('Your session has expired. Please sign in again.');
        }
        return throwError(() => refreshError);
      })
    );
  }

  private withAccessToken(req: HttpRequest<any>, accessToken: string, isRetry: boolean): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
        ...(isRetry ? { 'X-Refresh-Retry': '1' } : {})
      }
    });
  }

  private isLoginEndpoint(url: string): boolean {
    return url.includes('/auth/login') || url.includes('/auth/login/verify-otp');
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/');
  }

  private extractErrorMessage(error: HttpErrorResponse): string | null {
    const payload = error.error;
    if (!payload) return null;
    if (typeof payload === 'string') return payload;

    if (typeof payload.error === 'string') {
      return payload.error;
    }

    if (payload.error?.message && typeof payload.error.message === 'string') {
      return payload.error.message;
    }

    if (payload.message && typeof payload.message === 'string') {
      return payload.message;
    }

    return null;
  }
}
