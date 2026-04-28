import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { of } from 'rxjs'; // of is used to create fake observable data

describe('AuthService (Business Logic Service)', () => {
  let service: AuthService;
  let httpSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    // We Mock the dependencies directly (Pure Unit Testing)
    httpSpy = { post: vi.fn() };
    routerSpy = { navigate: vi.fn() };

    service = new AuthService(httpSpy as any, routerSpy as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should clear token and navigate to login on logout', () => {
    httpSpy.post.mockReturnValue(of({})); // Fake backend response

    // Act
    service.logout();

    // Assert
    expect(httpSpy.post).toHaveBeenCalled();
    expect(service.getAccessToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
