import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { AdminShellComponent } from './layout/admin-shell.component';
import { AdminTopbarComponent } from './layout/admin-topbar.component';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';
import { DealerApprovalsComponent } from './pages/dealer-approvals/dealer-approvals.component';
import { AllDealersComponent } from './pages/all-dealers/all-dealers.component';
import { CreditManagementComponent } from './pages/credit-management/credit-management.component';
import { AdminCategoriesComponent } from './pages/catalog-categories/admin-categories.component';
import { AdminProductsComponent } from './pages/catalog-products/admin-products.component';
import { AdminOrdersComponent } from './pages/admin-orders/admin-orders.component';
import { AdminOrderDetailComponent } from './pages/admin-order-detail/admin-order-detail.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { AdminReturnsComponent } from './pages/admin-returns/admin-returns.component';

// Logistics pages (shared module)
import { LogisticsPagesModule } from '../logistics/logistics-pages.module';
import { LogisticsDashboardComponent } from '../logistics/pages/dashboard/logistics-dashboard.component';
import { DispatchQueueComponent } from '../logistics/pages/dispatch-queue/dispatch-queue.component';
import { PendingDispatchComponent } from '../logistics/pages/pending-dispatch/pending-dispatch.component';
import { LiveTrackingComponent } from '../logistics/pages/live-tracking/live-tracking.component';
import { AgentsManagementComponent } from '../logistics/pages/agents/agents-management.component';
import { VehiclesManagementComponent } from '../logistics/pages/vehicles/vehicles-management.component';
import { SlaMonitorComponent } from '../logistics/pages/sla-monitor/sla-monitor.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'dealers/pending', component: DealerApprovalsComponent },
      { path: 'dealers', component: AllDealersComponent },
      { path: 'credit', component: CreditManagementComponent },
      { path: 'catalog/categories', component: AdminCategoriesComponent },
      { path: 'catalog/products', component: AdminProductsComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'orders/:orderId', component: AdminOrderDetailComponent },
      { path: 'returns', component: AdminReturnsComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'reports', component: ReportsComponent },
      // Logistics routes embedded in Admin shell
      { path: 'logistics', redirectTo: 'logistics/dashboard', pathMatch: 'full' },
      { path: 'logistics/dashboard', component: LogisticsDashboardComponent },
      { path: 'logistics/dispatch-queue', component: DispatchQueueComponent },
      { path: 'logistics/pending', component: PendingDispatchComponent },
      { path: 'logistics/tracking', component: LiveTrackingComponent },
      { path: 'logistics/agents', component: AgentsManagementComponent },
      { path: 'logistics/vehicles', component: VehiclesManagementComponent },
      { path: 'logistics/sla', component: SlaMonitorComponent },
    ]
  }
];

@NgModule({
  declarations: [
    AdminShellComponent,
    AdminTopbarComponent,
    AdminDashboardComponent,
    DealerApprovalsComponent,
    AllDealersComponent,
    CreditManagementComponent,
    AdminCategoriesComponent,
    AdminProductsComponent,
    AdminOrdersComponent,
    AdminOrderDetailComponent,
    AdminReturnsComponent,
    InventoryComponent,
    NotificationsComponent,
    ReportsComponent,
  ],
  imports: [
    SharedModule,
    LogisticsPagesModule,
    RouterModule.forChild(routes),
  ]
})
export class AdminModule { }
