import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AgentShellComponent } from './layout/agent-shell.component';
import { MyDeliveriesComponent } from './pages/my-deliveries/my-deliveries.component';
import { UpdateStatusComponent } from './pages/update-status/update-status.component';
import { AgentProfileComponent } from './pages/agent-profile/agent-profile.component';

const routes: Routes = [{
  path: '', component: AgentShellComponent, children: [
    { path: '', redirectTo: 'deliveries', pathMatch: 'full' },
    { path: 'deliveries', component: MyDeliveriesComponent },
    { path: 'status', component: UpdateStatusComponent },
    { path: 'profile', component: AgentProfileComponent },
  ]
}];

@NgModule({
  declarations: [AgentShellComponent, MyDeliveriesComponent, UpdateStatusComponent, AgentProfileComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AgentModule { }
