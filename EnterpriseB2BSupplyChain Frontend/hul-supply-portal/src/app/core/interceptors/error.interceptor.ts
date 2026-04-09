import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
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
          // Don't auto-redirect if it's a login attempt
          if (!req.url.includes('/auth/login')) {
            this.authService.logout();
            this.toast.error('Your session has expired. Please sign in again.');
          }
        } else if (error.status === 403) {
          if (!skipErrorToast) this.toast.error("You don't have permission to perform this action.");
        } else if (error.status === 404) {
          // Only show 404 errors for non-optional resources
          if (!skipErrorToast && !req.url.includes('/shipping-addresses')) {
            this.toast.error('Resource not found.');
          }
        } else if (error.status === 409) {
          const message = error.error?.error || 'Conflict detected.';
          this.toast.warning(message);
        } else if (error.status === 400) {
          const errors = error.error?.errors;
          if (errors && Array.isArray(errors)) {
            const messages = errors.map((e: any) => e.errorMessage || e).join('. ');
            this.toast.error(messages);
          } else if (error.error?.error) {
            this.toast.error(error.error.error);
          }
        } else if (error.status >= 500) {
          if (!skipErrorToast) this.toast.error('Something went wrong. Please try again or contact support.');
        }
        return throwError(() => error);
      })
    );
  }
}
