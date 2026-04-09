import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: false,
  template: `
    <div class="admin-shell">
      <hul-sidebar [items]="sidebarItems" [brandLabel]="'Admin Panel'" [sidebarClass]="'sidebar--admin'"
                   [collapsed]="sidebarCollapsed" (collapsedChange)="sidebarCollapsed = $event"></hul-sidebar>
      <div class="admin-shell__main" [class.admin-shell__main--expanded]="sidebarCollapsed">
        <app-admin-topbar [collapsed]="sidebarCollapsed" (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed"></app-admin-topbar>
        <div class="admin-shell__content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell { display: flex; min-height: 100vh; background: var(--bg-base); }
    .admin-shell__main { flex: 1; margin-left: 260px; transition: margin-left var(--duration-base) var(--ease-in-out); display: flex; flex-direction: column; }
    .admin-shell__main--expanded { margin-left: 72px; }
    .admin-shell__content { flex: 1; overflow: hidden; }
    @media (max-width: 768px) {
      .admin-shell__main { margin-left: 0; }
    }
  `]
})
export class AdminShellComponent implements OnInit {
  sidebarCollapsed = false;
  sidebarItems = [
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

  constructor(private authService: AuthService) {}

  ngOnInit(): void {}
}
