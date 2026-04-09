import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { HulConfirmService } from '../../../../shared/ui/confirm-dialog/hul-confirm.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-pending-dispatch', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header [title]="'Pending Shipments (' + unassigned.length + ')'" subtitle="Assign agents and dispatch orders"></hul-page-header>
      <hul-tabs [tabs]="tabs" [activeTab]="activeTab" (tabChange)="onTabChange($event)"></hul-tabs>
      <div class="cards-list" *ngIf="!loading">
        <div *ngIf="filtered.length === 0" class="empty-state">No pending shipments. Logistics is all clear. ✓</div>
        <div *ngFor="let s of filtered" class="shipment-card">
          <div class="shipment-card__header">
            <span class="mono font-lg">{{ s.orderId?.substring(0,8) }}</span>
            <hul-status-badge [status]="s.status"></hul-status-badge>
          </div>
          <div class="sla-row" [class.sla-row--urgent]="isUrgent(s)" [class.sla-row--critical]="isCritical(s)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Deliver by: {{ s.slaDeadlineUtc | date:'medium' }}</span>
            <span class="sla-badge" *ngIf="isCritical(s)">Urgent</span>
            <span class="sla-badge sla-badge--moderate" *ngIf="isUrgent(s) && !isCritical(s)">Moderate</span>
            <span class="sla-badge sla-badge--ok" *ngIf="!isUrgent(s) && !isCritical(s)">On track</span>
          </div>
          <div *ngIf="!s.agentName" class="assign-section">
            <div class="assign-row">
              <select [(ngModel)]="s._selectedAgent" class="assign-select">
                <option value="">Select Agent</option>
                <option *ngFor="let a of agents" [value]="a.agentId">{{ a.fullName }} ({{ a.phone }})</option>
              </select>
              <select [(ngModel)]="s._selectedVehicle" class="assign-select">
                <option value="">Select Vehicle</option>
                <option *ngFor="let v of vehicles" [value]="v.vehicleId">{{ v.registrationNo }} — {{ v.vehicleType }}</option>
              </select>
            </div>
            <button class="btn-assign" [disabled]="!s._selectedAgent || !s._selectedVehicle" (click)="assignAgent(s)">Assign & Dispatch</button>
          </div>
          <div *ngIf="s.agentName" class="assigned-info">
            <hul-avatar [name]="s.agentName" size="sm"></hul-avatar>
            <span>{{ s.agentName }} · {{ s.vehicleRegistrationNo }}</span>
          </div>
        </div>
      </div>
      <div *ngIf="loading" class="cards-list"><div *ngFor="let i of [1,2,3]" class="skeleton" style="height:200px;border-radius:var(--radius-lg)"></div></div>
    </div>
  `,
  styles: [`
    .cards-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 20px; }
    @media (min-width: 1400px) { .cards-list { grid-template-columns: repeat(4, 1fr); } }
    @media (min-width: 1024px) and (max-width: 1399px) { .cards-list { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 768px) and (max-width: 1023px) { .cards-list { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 767px) { .cards-list { grid-template-columns: 1fr; } }
    .empty-state { text-align: center; padding: 48px; color: var(--text-tertiary); font-size: 16px; background: var(--bg-card); border-radius: var(--radius-lg); grid-column: 1 / -1; }
    .shipment-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 16px; display: flex; flex-direction: column; transition: all var(--duration-fast); }
    .shipment-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .shipment-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .mono { font-family: var(--font-mono); } .font-lg { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .sla-row { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: var(--radius-md); background: #ecfdf5; color: #059669; font-size: 12px; font-weight: 500; margin-bottom: 12px; }
    :host-context(.dark) .sla-row { background: rgba(5,150,105,.1); }
    .sla-row--urgent { background: #fffbeb; color: #d97706; } :host-context(.dark) .sla-row--urgent { background: rgba(217,119,6,.1); }
    .sla-row--critical { background: #fef2f2; color: #ef4444; animation: pulse-border 2s infinite; } :host-context(.dark) .sla-row--critical { background: rgba(239,68,68,.1); }
    @keyframes pulse-border { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 0 2px rgba(239,68,68,.3); } }
    .sla-badge { padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #fef2f2; color: #ef4444; margin-left: auto; }
    .sla-badge--moderate { background: #fffbeb; color: #d97706; }
    .sla-badge--ok { background: #ecfdf5; color: #059669; }
    .assign-section { margin-top: 4px; }
    .assign-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
    .assign-select { width: 100%; padding: 8px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body); }
    .assign-select:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .btn-assign { width: 100%; padding: 10px; border-radius: var(--radius-md); border: none; background: var(--hul-primary); color: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: background var(--duration-fast); }
    .btn-assign:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .btn-assign:disabled { opacity: .5; cursor: not-allowed; }
    .assigned-info { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-muted); border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); }
  `]
})
export class PendingDispatchComponent implements OnInit {
  loading = true; shipments: any[] = []; filtered: any[] = []; unassigned: any[] = [];
  agents: any[] = []; vehicles: any[] = []; activeTab = 'Unassigned';
  tabs = [{ label: 'Unassigned', value: 'Unassigned' }, { label: 'Assigned', value: 'Assigned' }, { label: 'In Transit', value: 'InTransit' }];
  constructor(private http: ZoneHttpService, private confirm: HulConfirmService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); this.loadAgentsAndVehicles(); }
  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: s => {
        this.shipments = s.map(x => ({ ...x, _selectedAgent: '', _selectedVehicle: '' }));
        this.unassigned = this.shipments.filter(x => x.status === 'Pending');
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
  loadAgentsAndVehicles(): void {
    this.http.get<any[]>(API_ENDPOINTS.logistics.availableAgents()).subscribe({ next: a => this.agents = a.filter(x => x.status === 'Available'), error: () => {} });
    this.http.get<any[]>(API_ENDPOINTS.logistics.vehicles()).subscribe({ next: v => this.vehicles = v.filter(x => x.status === 'Available'), error: () => {} });
  }
  onTabChange(tab: string): void { this.activeTab = tab; this.applyFilter(); }
  applyFilter(): void {
    if (this.activeTab === 'Unassigned') this.filtered = this.shipments.filter(s => s.status === 'Pending');
    else if (this.activeTab === 'Assigned') this.filtered = this.shipments.filter(s => s.status === 'AgentAssigned');
    else this.filtered = this.shipments.filter(s => ['PickedUp','InTransit','OutForDelivery'].includes(s.status));
  }
  isUrgent(s: any): boolean { const hrs = this.hoursUntil(s.slaDeadlineUtc); return hrs < 48; }
  isCritical(s: any): boolean { return this.hoursUntil(s.slaDeadlineUtc) < 12; }
  hoursUntil(date: string): number { return (new Date(date).getTime() - Date.now()) / 3600000; }
  assignAgent(s: any): void {
    const agent = this.agents.find(a => a.agentId === s._selectedAgent);
    const vehicle = this.vehicles.find(v => v.vehicleId === s._selectedVehicle);
    this.confirm.confirm({ title: 'Assign Agent?', message: `Assign ${agent?.fullName} (${vehicle?.registrationNo}) to this order?`, confirmLabel: 'Assign & Dispatch', variant: 'info' }).subscribe(ok => {
      if (ok) this.http.post(API_ENDPOINTS.logistics.assignAgent(), { orderId: s.orderId, agentId: s._selectedAgent, vehicleId: s._selectedVehicle }).subscribe({
        next: () => { this.toast.success('Agent assigned. Dealer notified.'); this.load(); this.loadAgentsAndVehicles(); },
        error: err => this.toast.error(err.error?.error || 'Failed to assign')
      });
    });
  }
}
