import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { DataTableColumn } from '../../../../shared/ui/data-table/hul-data-table.component';

@Component({
  selector: 'app-sla-monitor', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="SLA Monitor" subtitle="Track delivery SLA compliance"></hul-page-header>
      <div *ngIf="atRiskCount > 0" class="sla-alert">
        <span>🚨 {{ atRiskCount }} deliveries are at risk of SLA breach</span>
      </div>
      <hul-data-table [columns]="columns" [data]="shipments" [loading]="loading" [totalCount]="shipments.length"
        [currentPage]="1" [pageSize]="50" emptyMessage="No active shipments to monitor.">
      </hul-data-table>
    </div>
  `,
  styles: [`
    .sla-alert { display: flex; align-items: center; gap: 8px; padding: 14px 20px; border-radius: var(--radius-lg); background: #fef2f2; border: 1px solid #fca5a5; color: #ef4444; font-size: 15px; font-weight: 700; margin-bottom: 20px; animation: pulse-border 2s infinite; }
    :host-context(.dark) .sla-alert { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.3); }
    @keyframes pulse-border { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 0 3px rgba(239,68,68,.15); } }
  `]
})
export class SlaMonitorComponent implements OnInit {
  loading = true; shipments: any[] = []; atRiskCount = 0;
  columns: DataTableColumn[] = [
    { key: 'orderId', label: 'Order', type: 'text', sortable: true },
    { key: 'agentName', label: 'Agent', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'AgentAssigned': 'warning', 'PickedUp': 'info', 'InTransit': 'info', 'OutForDelivery': 'primary' } },
    { key: 'slaDeadlineUtc', label: 'SLA Deadline', type: 'date', sortable: true },
    { key: 'timeRemaining', label: 'Time Remaining', type: 'text' },
    { key: 'riskLevel', label: 'Risk Level', type: 'badge', badgeMap: { 'On Track': 'success', 'At Risk': 'warning', 'Critical': 'danger', 'Overdue': 'danger' } },
  ];
  constructor(private http: ZoneHttpService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: s => {
        this.shipments = s.filter(x => x.status !== 'Delivered').map(x => {
          const hrs = (new Date(x.slaDeadlineUtc).getTime() - Date.now()) / 3600000;
          let timeRemaining = hrs < 0 ? 'OVERDUE' : `${Math.floor(hrs / 24)}d ${Math.floor(hrs % 24)}h`;
          // On Track: > 24h remaining; At Risk: 8–24h; Critical: 0–8h; Overdue: past deadline
          // Only flag after the agent has had meaningful time — newly assigned orders won't be At Risk
          let riskLevel = hrs > 24 ? 'On Track' : hrs > 8 ? 'At Risk' : hrs > 0 ? 'Critical' : 'Overdue';
          return { ...x, timeRemaining, riskLevel, orderId: x.orderId?.substring(0, 8) };
        }).sort((a, b) => new Date(a.slaDeadlineUtc).getTime() - new Date(b.slaDeadlineUtc).getTime());
        this.atRiskCount = this.shipments.filter(x => x.riskLevel === 'At Risk' || x.riskLevel === 'Critical' || x.riskLevel === 'Overdue').length;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
