import { Component } from '@angular/core';

@Component({
  selector: 'app-logistics-shell', standalone: false,
  template: `
    <div class="lg-shell">
      <hul-sidebar [items]="sidebarItems" [brandLabel]="'Logistics'" [sidebarClass]="'sidebar--logistics'"
                   [collapsed]="collapsed" (collapsedChange)="collapsed = $event"></hul-sidebar>
      <div class="lg-shell__main" [class.lg-shell__main--expanded]="collapsed">
        <app-logistics-topbar [collapsed]="collapsed" (toggleSidebar)="collapsed = !collapsed"></app-logistics-topbar>
        <div class="lg-shell__content"><router-outlet></router-outlet></div>
      </div>
    </div>
  `,
  styles: [`
    .lg-shell { display: flex; min-height: 100vh; background: var(--bg-base); }
    .lg-shell__main { flex: 1; margin-left: 260px; transition: margin-left var(--duration-base) var(--ease-in-out); display: flex; flex-direction: column; }
    .lg-shell__main--expanded { margin-left: 72px; }
    .lg-shell__content { flex: 1; padding: 24px; max-width: 1440px; margin: 0 auto; width: 100%; }
    @media (max-width: 768px) { .lg-shell__main { margin-left: 0; } }
  `]
})
export class LogisticsShellComponent {
  collapsed = false;
  sidebarItems = [
    { label: 'Back to Admin', route: '/admin/dashboard', icon: 'corner-down-left' },
    { label: 'Dashboard', route: '/logistics/dashboard', icon: 'layout-dashboard' },
    { label: 'Dispatch Queue', route: '/logistics/dispatch-queue', icon: 'package' },
    { label: 'Pending Shipments', route: '/logistics/pending', icon: 'truck' },
    { label: 'Live Tracking', route: '/logistics/tracking', icon: 'map-pin' },
    { label: 'Agents', route: '/logistics/agents', icon: 'users' },
    { label: 'Vehicles', route: '/logistics/vehicles', icon: 'truck' },
    { label: 'SLA Monitor', route: '/logistics/sla', icon: 'clock' },
  ];
}
