import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { LogisticsDashboardComponent } from './pages/dashboard/logistics-dashboard.component';
import { PendingDispatchComponent } from './pages/pending-dispatch/pending-dispatch.component';
import { DispatchQueueComponent } from './pages/dispatch-queue/dispatch-queue.component';
import { LiveTrackingComponent } from './pages/live-tracking/live-tracking.component';
import { AgentsManagementComponent } from './pages/agents/agents-management.component';
import { VehiclesManagementComponent } from './pages/vehicles/vehicles-management.component';
import { SlaMonitorComponent } from './pages/sla-monitor/sla-monitor.component';

const COMPONENTS = [
  LogisticsDashboardComponent,
  PendingDispatchComponent,
  DispatchQueueComponent,
  LiveTrackingComponent,
  AgentsManagementComponent,
  VehiclesManagementComponent,
  SlaMonitorComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [SharedModule],
  exports: COMPONENTS,
})
export class LogisticsPagesModule { }
