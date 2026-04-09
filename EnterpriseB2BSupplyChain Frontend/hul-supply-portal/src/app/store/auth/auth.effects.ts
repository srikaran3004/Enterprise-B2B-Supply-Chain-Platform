import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map(response => {
            const decoded = this.authService.getDecodedToken();
            return AuthActions.loginSuccess({
              token: decoded!,
              accessToken: response.accessToken,
              role: response.role,
              fullName: response.fullName,
            });
          }),
          catchError(error => of(AuthActions.loginFailure({ error: error.error?.error || 'Login failed' })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(() => {
        const route = this.authService.getRoleDashboardRoute();
        this.router.navigate([route]);
      })
    ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => this.authService.logout())
    ),
    { dispatch: false }
  );

  loadFromStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUserFromStorage),
      map(() => {
        const decoded = this.authService.getDecodedToken();
        if (decoded && decoded.exp * 1000 > Date.now()) {
          return AuthActions.loadUserFromStorageSuccess({ token: decoded });
        }
        return AuthActions.logout();
      })
    )
  );
}
