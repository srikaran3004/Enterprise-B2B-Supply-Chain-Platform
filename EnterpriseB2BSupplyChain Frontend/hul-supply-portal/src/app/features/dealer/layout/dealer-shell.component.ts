import { Component } from '@angular/core';
import { SidebarItem } from '../../../shared/ui/sidebar/hul-sidebar.component';

@Component({
  selector: 'app-dealer-shell',
  standalone: false,
  template: `
    <div class="dealer-shell" [class.dealer-shell--collapsed]="sidebarCollapsed">
      <hul-sidebar
        [menuItems]="menuItems"
        [collapsed]="sidebarCollapsed">
      </hul-sidebar>

      <div class="dealer-shell__main">
        <app-dealer-topbar
          [sidebarCollapsed]="sidebarCollapsed"
          (toggleSidebar)="sidebarCollapsed = !sidebarCollapsed">
        </app-dealer-topbar>
        <main class="dealer-shell__content">
          <router-outlet></router-outlet>
        </main>
      </div>
      
      <!-- Cart Slideover Component -->
      <app-cart-slideover></app-cart-slideover>
    </div>
  `,
  styles: [`
    .dealer-shell {
      display: flex;
      min-height: 100vh;
      background: var(--bg-subtle);
    }

    .dealer-shell__main {
      flex: 1;
      margin-left: 248px;
      display: flex;
      flex-direction: column;
      transition: margin-left var(--duration-slow) var(--ease-in-out);
    }

    .dealer-shell--collapsed .dealer-shell__main {
      margin-left: 68px;
    }

    .dealer-shell__content {
      flex: 1;
      padding: 24px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 1023px) {
      .dealer-shell__main {
        margin-left: 0 !important;
      }
    }
  `]
})
export class DealerShellComponent {
  sidebarCollapsed = false;

  menuItems: SidebarItem[] = [
    { label: 'Home', route: '/dealer/dashboard', icon: 'home' },
    { label: 'Catalog', route: '/dealer/catalog', icon: 'package' },
    { label: 'My Orders', route: '/dealer/orders', icon: 'shopping-bag' },
    { label: 'Invoices', route: '/dealer/invoices', icon: 'receipt' },
    { label: 'Returns', route: '/dealer/returns', icon: 'rotate-ccw' },
    { label: 'Notifications', route: '/dealer/notifications', icon: 'bell' },
    { label: 'Profile', route: '/dealer/profile', icon: 'user' },
  ];
}
