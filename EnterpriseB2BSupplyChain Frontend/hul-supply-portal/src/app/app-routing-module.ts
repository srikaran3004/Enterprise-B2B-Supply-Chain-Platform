import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UnauthorizedPageComponent } from './features/unauthorized/unauthorized-page.component';

const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'dealer',
    loadChildren: () => import('./features/dealer/dealer.module').then(m => m.DealerModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Dealer'] }
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'SuperAdmin'] },
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
  },
  {
    path: 'logistics',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Admin', 'SuperAdmin'] },
    loadChildren: () => import('./features/logistics/logistics.module').then(m => m.LogisticsModule),
  },
  {
    path: 'agent',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['DeliveryAgent'] },
    loadChildren: () => import('./features/agent/agent.module').then(m => m.AgentModule),
  },
  {
    path: 'super-admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SuperAdmin'] },
    loadChildren: () => import('./features/super-admin/super-admin.module').then(m => m.SuperAdminModule),
  },
  {
    path: 'unauthorized',
    component: UnauthorizedPageComponent,
  },
  { path: '**', redirectTo: 'auth/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
