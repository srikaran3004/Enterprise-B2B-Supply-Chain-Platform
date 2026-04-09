import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DealerShellComponent } from './layout/dealer-shell.component';
import { DealerTopbarComponent } from './layout/dealer-topbar.component';
import { CartSlideoverComponent } from './components/cart-slideover/cart-slideover.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ReturnsComponent } from './pages/returns/returns.component';
import { DealerNotificationsComponent } from './pages/notifications/notifications.component';
import { RateDeliveryComponent } from './components/rate-delivery/rate-delivery.component';

const routes: Routes = [
  {
    path: '',
    component: DealerShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'catalog', component: CatalogComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'orders/:orderId', component: OrderDetailComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'returns', component: ReturnsComponent },
      { path: 'notifications', component: DealerNotificationsComponent },
    ],
  },
];

@NgModule({
  declarations: [
    DealerShellComponent,
    DealerTopbarComponent,
    CartSlideoverComponent,
    DashboardComponent,
    CatalogComponent,
    OrdersComponent,
    OrderDetailComponent,
    InvoicesComponent,
    ProfileComponent,
    ReturnsComponent,
    DealerNotificationsComponent,
    RateDeliveryComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DealerModule {}
