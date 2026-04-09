import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LogisticsPagesModule } from './logistics-pages.module';
import { LogisticsShellComponent } from './layout/logistics-shell.component';
import { LogisticsTopbarComponent } from './layout/logistics-topbar.component';
import { LogisticsDashboardComponent } from './pages/dashboard/logistics-dashboard.component';
import { PendingDispatchComponent } from './pages/pending-dispatch/pending-dispatch.component';
import { DispatchQueueComponent } from './pages/dispatch-queue/dispatch-queue.component';
import { LiveTrackingComponent } from './pages/live-tracking/live-tracking.component';
import { AgentsManagementComponent } from './pages/agents/agents-management.component';
import { VehiclesManagementComponent } from './pages/vehicles/vehicles-management.component';
import { SlaMonitorComponent } from './pages/sla-monitor/sla-monitor.component';

const routes: Routes = [{
  path: '', component: LogisticsShellComponent, children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: LogisticsDashboardComponent },
    { path: 'dispatch-queue', component: DispatchQueueComponent },
    { path: 'pending', component: PendingDispatchComponent },
    { path: 'tracking', component: LiveTrackingComponent },
    { path: 'agents', component: AgentsManagementComponent },
    { path: 'vehicles', component: VehiclesManagementComponent },
    { path: 'sla', component: SlaMonitorComponent },
  ]
}];

@NgModule({
  declarations: [LogisticsShellComponent, LogisticsTopbarComponent],
  imports: [SharedModule, LogisticsPagesModule, RouterModule.forChild(routes)]
})
export class LogisticsModule { }
