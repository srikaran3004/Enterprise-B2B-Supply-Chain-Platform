import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleGuard } from './role.guard';
import { UserRole } from '../models/user.model';
import { of } from 'rxjs';

describe('RoleGuard (Security Verification)', () => {
  let guard: RoleGuard;
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = { ensureAuthenticated: vi.fn(), getUserRole: vi.fn() };
    routerSpy = { createUrlTree: vi.fn() };

    // Pure class instantiation (no Angular TestBed needed!)
    guard = new RoleGuard(authServiceSpy as any, routerSpy as any);
  });

  it('should return TRUE if user is authenticated and is a Dealer', () => {
    return new Promise<void>((done) => {
      authServiceSpy.ensureAuthenticated.mockReturnValue(of(true));
      authServiceSpy.getUserRole.mockReturnValue(UserRole.Dealer);

      const mockRoute = { data: { roles: [UserRole.Dealer] } } as any;

      guard.canActivate(mockRoute).subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });
  });

  it('should redirect back to /unauthorized if user is an Agent trying to access Admin area', () => {
    return new Promise<void>((done) => {
      authServiceSpy.ensureAuthenticated.mockReturnValue(of(true));
      authServiceSpy.getUserRole.mockReturnValue(UserRole.DeliveryAgent);

      const mockUrlTree = { isUrlTree: true } as any;
      routerSpy.createUrlTree.mockReturnValue(mockUrlTree);

      const mockRoute = { data: { roles: [UserRole.Admin] } } as any;

      guard.canActivate(mockRoute).subscribe((result) => {
        expect(result).toBe(mockUrlTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/unauthorized']); 
        done();
      });
    });
  });
});
