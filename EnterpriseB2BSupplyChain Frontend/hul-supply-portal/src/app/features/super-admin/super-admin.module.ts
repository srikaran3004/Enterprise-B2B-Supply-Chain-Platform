import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SuperAdminShellComponent } from './layout/super-admin-shell.component';
import { SuperAdminDashboardComponent } from './pages/dashboard/super-admin-dashboard.component';
import { StaffManagementComponent } from './pages/staff-management/staff-management.component';

const routes: Routes = [{
  path: '', component: SuperAdminShellComponent, children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: SuperAdminDashboardComponent },
    { path: 'staff', component: StaffManagementComponent },
  ]
}];

@NgModule({
  declarations: [SuperAdminShellComponent, SuperAdminDashboardComponent, StaffManagementComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class SuperAdminModule { }
