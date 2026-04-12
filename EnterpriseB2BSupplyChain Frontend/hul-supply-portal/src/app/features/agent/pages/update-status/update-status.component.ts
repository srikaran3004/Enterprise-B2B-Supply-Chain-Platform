import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-update-status', standalone: false,
  template: `
    <div>
      <h2 class="page-title">Update Delivery Status</h2>
      <p class="page-subtitle">Select a delivery and update its current status</p>

      <div *ngIf="deliveries.length === 0" class="empty">No active deliveries to update.</div>

      <div *ngFor="let d of deliveries" class="status-card">
        <div class="status-card__header">
          <span class="mono">{{ d.orderId?.substring(0,8) }}</span>
          <hul-status-badge [status]="d.status"></hul-status-badge>
        </div>
        <div class="status-card__dealer">{{ d.dealerName || 'Dealer' }}</div>

        <div class="status-options">
          <button *ngFor="let opt of getOptions(d)" class="status-option" [class.status-option--active]="opt === d._newStatus" (click)="d._newStatus = opt">{{ getLabel(opt) }}</button>
        </div>

        <textarea [(ngModel)]="d._notes" class="notes-input" placeholder="Add notes (optional)" rows="2"></textarea>

        <button class="btn-update" [disabled]="!d._newStatus" (click)="submit(d)">Update Status</button>
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0 0 20px; }
    .empty { text-align: center; padding: 48px; color: var(--text-tertiary); font-size: 16px; }
    .status-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px; margin-bottom: 16px; }
    .status-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .mono { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .status-card__dealer { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
    .status-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .status-option {
      padding: 10px 18px; border-radius: var(--radius-lg); border: 2px solid var(--border-default);
      background: var(--bg-card); color: var(--text-secondary); font-size: 14px; font-weight: 500;
      cursor: pointer; font-family: var(--font-body); transition: all var(--duration-fast);
    }
    .status-option:hover { border-color: var(--hul-primary); }
    .status-option--active { border-color: var(--hul-primary); background: var(--hul-primary-light); color: var(--hul-primary); font-weight: 600; }
    .notes-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; resize: vertical; margin-bottom: 12px; }
    .notes-input:focus { outline: none; border-color: var(--border-focus); }
    .btn-update { width: 100%; padding: 14px; border-radius: var(--radius-lg); border: none; background: var(--hul-primary); color: white; font-size: 16px; font-weight: 600; cursor: pointer; font-family: var(--font-body); min-height: 48px; }
    .btn-update:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class UpdateStatusComponent implements OnInit {
  deliveries: any[] = [];
  private statusFlow: Record<string, string[]> = {
    'AgentAssigned': ['PickedUp'],
    'PickedUp': ['InTransit'],
    'InTransit': ['OutForDelivery', 'VehicleBreakdown'],
    'OutForDelivery': ['Delivered'],
    'VehicleBreakdown': ['InTransit'],
  };
  private labels: Record<string, string> = {
    'PickedUp': '📦 Picked Up',
    'InTransit': '🚚 In Transit',
    'OutForDelivery': '📍 Out for Delivery',
    'Delivered': '✅ Delivered',
    'VehicleBreakdown': '🚨 Vehicle Breakdown',
  };

  constructor(private http: ZoneHttpService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: s => this.deliveries = s.filter(x => x.status !== 'Delivered').map(x => ({ ...x, _newStatus: '', _notes: '' })),
      error: () => {}
    });
  }
  getOptions(d: any): string[] { return this.statusFlow[d.status] || []; }
  getLabel(status: string): string { return this.labels[status] || status; }
  submit(d: any): void {
    this.http.put(API_ENDPOINTS.logistics.updateShipmentStatus(d.orderId), { status: d._newStatus, notes: d._notes || null, latitude: null, longitude: null }).subscribe({
      next: () => { this.toast.success('Status updated'); this.load(); },
      error: err => this.toast.error(err.error?.error || 'Update failed')
    });
  }
}
