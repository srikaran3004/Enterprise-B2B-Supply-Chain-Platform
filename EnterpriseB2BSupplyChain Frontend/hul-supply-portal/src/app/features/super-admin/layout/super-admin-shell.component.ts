import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-super-admin-shell', standalone: false,
  template: `
    <div class="sa-shell">
      <hul-sidebar [items]="sidebarItems" [brandLabel]="'Super Admin'" [sidebarClass]="'sidebar--super-admin'"
                   [collapsed]="collapsed" (collapsedChange)="collapsed = $event"></hul-sidebar>
      <div class="sa-shell__main" [class.sa-shell__main--expanded]="collapsed">
        <header class="topbar">
          <div class="topbar__left">
            <button class="topbar__toggle" (click)="collapsed = !collapsed"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
            <select [(ngModel)]="activePortal" (change)="onPortalChange()" class="portal-select">
              <option value="superadmin">Global Portal</option>
              <option value="admin">HUL India (Admin)</option>
            </select>
            <span class="topbar__role-badge" style="background:#fdf2f8;color:#db2777">Super Admin</span>
          </div>
          <div class="topbar__right">
            <button class="topbar__icon-btn" (click)="themeService.toggle()"><svg *ngIf="!themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg *ngIf="themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
            <hul-avatar [name]="userName" size="sm"></hul-avatar>
            <button class="topbar__icon-btn" (click)="authService.logout()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
          </div>
        </header>
        <div class="sa-shell__content"><router-outlet></router-outlet></div>
      </div>
    </div>
  `,
  styles: [`
    .sa-shell { display: flex; min-height: 100vh; background: var(--bg-base); }
    .sa-shell__main { flex: 1; margin-left: 260px; transition: margin-left var(--duration-base) var(--ease-in-out); display: flex; flex-direction: column; }
    .sa-shell__main--expanded { margin-left: 72px; }
    .sa-shell__content { flex: 1; padding: 24px; max-width: 1440px; margin: 0 auto; width: 100%; }
    .topbar { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 24px; background: var(--bg-card); border-bottom: 1px solid var(--border-default); position: sticky; top: 0; z-index: 100; }
    .topbar__left, .topbar__right { display: flex; align-items: center; gap: 12px; }
    .topbar__toggle { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 6px; border-radius: var(--radius-md); }
    .topbar__toggle:hover { background: var(--bg-muted); }
    .topbar__role-badge { padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    :host-context(.dark) .topbar__role-badge { background: rgba(219,39,119,.15) !important; }
    .topbar__icon-btn { background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 8px; border-radius: var(--radius-md); display: flex; align-items: center; }
    .topbar__icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .portal-select { background: var(--bg-muted); border: 1px solid var(--border-default); color: var(--text-primary); font-family: var(--font-display); font-weight: 600; font-size: 13px; padding: 6px 12px; border-radius: var(--radius-md); outline: none; cursor: pointer; }
    .portal-select:focus { border-color: var(--border-focus); }
    @media (max-width: 768px) { .sa-shell__main { margin-left: 0; } }
  `]
})
export class SuperAdminShellComponent {
  collapsed = false; userName: string;
  activePortal: 'superadmin' | 'admin' = 'superadmin';

  superAdminItems = [
    { label: 'Dashboard', route: '/super-admin/dashboard', icon: 'layout-dashboard' },
    { label: 'Staff Management', route: '/super-admin/staff', icon: 'user-plus' },
  ];

  adminItems = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'layout-dashboard' },
    { label: 'Dealer Approvals', route: '/admin/dealers/pending', icon: 'user-check' },
    { label: 'All Dealers', route: '/admin/dealers', icon: 'users' },
    { label: 'Categories', route: '/admin/catalog/categories', icon: 'folder' },
    { label: 'Products', route: '/admin/catalog/products', icon: 'package' },
    { label: 'All Orders', route: '/admin/orders', icon: 'shopping-bag' },
    {
      label: 'Logistics', route: '/admin/logistics', icon: 'truck',
      children: [
        { label: 'Dashboard', route: '/admin/logistics/dashboard', icon: 'layout-dashboard' },
        { label: 'Dispatch Queue', route: '/admin/logistics/dispatch-queue', icon: 'package' },
        { label: 'Pending Shipments', route: '/admin/logistics/pending', icon: 'truck' },
        { label: 'Live Tracking', route: '/admin/logistics/tracking', icon: 'map-pin' },
        { label: 'Agents', route: '/admin/logistics/agents', icon: 'users' },
        { label: 'Vehicles', route: '/admin/logistics/vehicles', icon: 'truck' },
        { label: 'SLA Monitor', route: '/admin/logistics/sla', icon: 'clock' },
      ]
    },
    { label: 'Returns', route: '/admin/returns', icon: 'corner-down-left' },
    { label: 'Inventory', route: '/admin/inventory', icon: 'warehouse' },
    { label: 'Notifications', route: '/admin/notifications', icon: 'bell' },
    { label: 'Reports', route: '/admin/reports', icon: 'bar-chart-2' },
  ];

  get sidebarItems() {
    return this.activePortal === 'superadmin' ? this.superAdminItems : this.adminItems;
  }

  constructor(public authService: AuthService, public themeService: ThemeService, private router: Router) { 
    this.userName = authService.getUserName() || 'Super Admin'; 
    // Keep portal selector synced with actual route.
    this.syncActivePortalWithRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.syncActivePortalWithRoute(event.urlAfterRedirects));
  }

  onPortalChange(): void {
    if (this.activePortal === 'superadmin') this.router.navigate(['/super-admin/dashboard']);
    else this.router.navigate(['/admin/dashboard']);
  }

  private syncActivePortalWithRoute(url: string): void {
    if (url.startsWith('/admin')) {
      this.activePortal = 'admin';
      return;
    }

    if (url.startsWith('/super-admin')) {
      this.activePortal = 'superadmin';
    }
  }
}

