import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-topbar',
  standalone: false,
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button class="topbar__toggle" (click)="toggleSidebar.emit()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <select *ngIf="isSuperAdmin" [(ngModel)]="activePortal" (change)="onPortalChange()" class="portal-select">
          <option value="admin">HUL India (Admin)</option>
          <option value="superadmin">Global Portal</option>
        </select>
        <span class="topbar__role-badge">{{ isSuperAdmin ? 'Super Admin' : 'Admin' }}</span>
      </div>
      <div class="topbar__right">
        <button class="topbar__icon-btn" (click)="themeService.toggle()" [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
          <svg *ngIf="!themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg *ngIf="themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <app-notification-bell></app-notification-bell>
        <div class="topbar__user">
          <hul-avatar [name]="userName" size="sm"></hul-avatar>
          <span class="topbar__username">{{ userName }}</span>
        </div>
        <button class="topbar__icon-btn" (click)="logout()" title="Sign out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 60px; padding: 0 24px; background: var(--bg-card);
      border-bottom: 1px solid var(--border-default); position: sticky; top: 0; z-index: 100;
    }
    .topbar__left { display: flex; align-items: center; gap: 12px; }
    .topbar__right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    .topbar__toggle { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 6px; border-radius: var(--radius-md); }
    .topbar__toggle:hover { background: var(--bg-muted); }
    .topbar__role-badge {
      padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; background: #fffbeb; color: #d97706;
    }
    :host-context(.dark) .topbar__role-badge { background: rgba(217,119,6,.15); }
    .topbar__icon-btn { background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 8px; border-radius: var(--radius-md); display: flex; align-items: center; transition: all var(--duration-fast); }
    .topbar__icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .topbar__user { display: flex; align-items: center; gap: 8px; }
    .topbar__username { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .portal-select { background: var(--bg-muted); border: 1px solid var(--border-default); color: var(--text-primary); font-family: var(--font-display); font-weight: 600; font-size: 13px; padding: 6px 12px; border-radius: var(--radius-md); outline: none; cursor: pointer; }
    .portal-select:focus { border-color: var(--border-focus); }
    @media (max-width: 640px) { .topbar__username { display: none; } }
  `]
})
export class AdminTopbarComponent {
  private readonly destroyRef = inject(DestroyRef);

  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  userName: string;
  isSuperAdmin = false;
  activePortal = 'admin';

  constructor(private authService: AuthService, public themeService: ThemeService, private router: Router) {
    this.userName = this.authService.getUserName() || 'Admin';
    this.isSuperAdmin = this.authService.getUserRole() === 'SuperAdmin';

    if (this.isSuperAdmin) {
      this.syncActivePortalWithRoute(this.router.url);
      this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(event => this.syncActivePortalWithRoute(event.urlAfterRedirects));
    }
  }

  onPortalChange(): void {
    if (this.activePortal === 'superadmin') {
      this.router.navigate(['/super-admin/dashboard']);
      return;
    }

    this.router.navigate(['/admin/dashboard']);
  }

  logout(): void { this.authService.logout(); }

  private syncActivePortalWithRoute(url: string): void {
    this.activePortal = url.startsWith('/super-admin') ? 'superadmin' : 'admin';
  }
}
