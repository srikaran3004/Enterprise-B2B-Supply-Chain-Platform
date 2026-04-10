import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.authService.ensureAuthenticated().pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          return this.router.createUrlTree(['/auth/login']);
        }

        const requiredRoles = route.data['roles'] as UserRole[];
        if (!requiredRoles || requiredRoles.length === 0) {
          return true;
        }

        const userRole = this.authService.getUserRole();
        if (userRole && requiredRoles.includes(userRole)) {
          return true;
        }

        return this.router.createUrlTree(['/unauthorized']);
      })
    );
  }
}
