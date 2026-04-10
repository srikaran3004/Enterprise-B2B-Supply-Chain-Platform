import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

interface OrderStage {
  key: string;
  label: string;
}

@Component({
  selector: 'app-live-tracking', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Live Tracking" subtitle="Monitor all active deliveries in real time"></hul-page-header>
      <hul-tabs [tabs]="tabs" [activeTab]="activeTab" (tabChange)="onTabChange($event)"></hul-tabs>

      <div class="tracking-grid" *ngIf="!loading">
        <div *ngIf="filtered.length === 0" class="empty" style="grid-column:1/-1">No active deliveries at the moment.</div>
        <button *ngFor="let s of filtered" type="button" class="tracking-card" (click)="openDetails(s)">
          <div class="tracking-card__header">
            <span class="mono">{{ s.orderId?.substring(0,8) }}</span>
            <hul-status-badge [status]="s.status"></hul-status-badge>
          </div>
          <div *ngIf="s.agentName" class="tracking-card__agent">
            <hul-avatar [name]="s.agentName" size="sm"></hul-avatar>
            <div><span class="agent-name">{{ s.agentName }}</span><span class="agent-phone">{{ s.agentPhone }}</span></div>
          </div>
          <div class="tracking-card__info">
            <div class="info-line"><span class="info-key">Vehicle</span><span>{{ s.vehicleRegistrationNo || '—' }}</span></div>
            <div class="info-line"><span class="info-key">SLA</span><span [class.sla-warn]="s.slaAtRisk">{{ s.slaDeadlineUtc | date:'mediumDate' }}</span></div>
          </div>
          <div class="tracking-card__cta">View Full Tracking</div>
        </button>
      </div>

      <div *ngIf="loading" class="tracking-grid">
        <div *ngFor="let i of [1,2,3]" class="skeleton" style="height:200px;border-radius:var(--radius-lg)"></div>
      </div>
    </div>

    <hul-modal
      [isOpen]="detailsOpen"
      size="xl"
      [title]="selectedOrder ? ('Live Tracking • ' + selectedOrder.orderNumber) : 'Live Tracking'"
      (closed)="closeDetails()">

      <div *ngIf="detailsLoading" class="detail-loading">
        <div *ngFor="let i of [1,2,3]" class="skeleton detail-skel"></div>
      </div>

      <div *ngIf="!detailsLoading && selectedOrder" class="tracking-detail">
        <div class="detail-header-grid">
          <div>
            <div class="detail-label">Dealer</div>
            <div class="detail-value">{{ selectedOrder.dealerName || 'Dealer' }}</div>
          </div>
          <div>
            <div class="detail-label">Order Status</div>
            <div class="detail-value">{{ formatStatus(selectedOrder.status) }}</div>
          </div>
          <div>
            <div class="detail-label">Shipment Status</div>
            <div class="detail-value">{{ formatStatus(selectedTracking?.currentStatus || 'Pending') }}</div>
          </div>
          <div>
            <div class="detail-label">SLA Deadline</div>
            <div class="detail-value">{{ formatIST(selectedTracking?.slaDeadlineUtc) }}</div>
          </div>
        </div>

        <div class="progress-card">
          <div class="progress-title">Order Progress</div>
          <div class="progress-row">
            <div *ngFor="let stage of orderStages; let i = index" class="progress-step"
                 [class.progress-step--done]="isStageCompleted(stage.key)"
                 [class.progress-step--active]="isStageActive(stage.key)">
              <div class="progress-line" *ngIf="i > 0" [class.progress-line--done]="isStageCompleted(stage.key)"></div>
              <div class="progress-dot">{{ i + 1 }}</div>
              <div class="progress-label">{{ stage.label }}</div>
              <div class="progress-date" *ngIf="getStageDate(stage.key)">
                {{ getStageDate(stage.key) | date:'dd MMM, h:mm a' }}
              </div>
            </div>
          </div>
        </div>

        <div class="agent-card" *ngIf="selectedTracking?.agentName">
          <hul-avatar [name]="selectedTracking.agentName" size="md"></hul-avatar>
          <div class="agent-meta">
            <div class="agent-name">{{ selectedTracking.agentName }}</div>
            <div class="agent-phone">{{ selectedTracking.agentPhone || 'Phone unavailable' }}</div>
          </div>
          <div class="agent-vehicle" *ngIf="selectedTracking.vehicleRegistrationNo">
            {{ selectedTracking.vehicleType }} • {{ selectedTracking.vehicleRegistrationNo }}
          </div>
        </div>

        <div class="activity-card">
          <div class="activity-title">Activity Log</div>
          <div *ngIf="activityEvents.length === 0" class="empty-activity">No activity yet.</div>
          <div *ngFor="let ev of activityEvents; let last = last" class="activity-item">
            <div class="activity-left">
              <div class="activity-dot" [class.activity-dot--last]="last"></div>
              <div class="activity-line" *ngIf="!last"></div>
            </div>
            <div class="activity-body">
              <div class="activity-status">{{ formatStatus(ev.status) }}</div>
              <div class="activity-time">{{ formatIST(ev.timestamp) }}</div>
              <div class="activity-note" *ngIf="ev.note">{{ ev.note }}</div>
              <div class="activity-place" *ngIf="ev.place">@ {{ ev.place }}</div>
            </div>
          </div>
        </div>
      </div>
    </hul-modal>
  `,
  styles: [`
    .tracking-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    @media (max-width: 768px) { .tracking-grid { grid-template-columns: 1fr; } }
    .empty { text-align: center; padding: 48px; color: var(--text-tertiary); font-size: 14px; background: var(--bg-card); border-radius: var(--radius-lg); }
    .tracking-card {
      text-align: left; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 20px;
      border: 1px solid var(--border-default); cursor: pointer; transition: transform var(--duration-fast), box-shadow var(--duration-fast), border-color var(--duration-fast);
    }
    .tracking-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); border-color: var(--hul-primary); }
    .tracking-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .mono { font-family: var(--font-mono); font-weight: 700; font-size: 15px; color: var(--text-primary); }
    .tracking-card__agent { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .agent-name { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .agent-phone { display: block; font-size: 12px; color: var(--text-tertiary); }
    .tracking-card__info { border-top: 1px solid var(--border-default); padding-top: 10px; }
    .info-line { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: var(--text-primary); }
    .info-key { color: var(--text-tertiary); }
    .sla-warn { color: #ef4444; font-weight: 600; }
    .tracking-card__cta { margin-top: 12px; font-size: 12px; font-weight: 700; color: var(--hul-primary); text-transform: uppercase; letter-spacing: .04em; }

    .detail-loading { display: flex; flex-direction: column; gap: 12px; }
    .detail-skel { height: 120px; border-radius: var(--radius-lg); }

    .tracking-detail { display: flex; flex-direction: column; gap: 16px; }
    .detail-header-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px 16px;
    }
    @media (max-width: 900px) { .detail-header-grid { grid-template-columns: repeat(2, 1fr); } }
    .detail-label { font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
    .detail-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }

    .progress-card { border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px 16px; }
    .progress-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; }
    .progress-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0; }
    @media (max-width: 900px) { .progress-row { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 0; } }
    .progress-step { position: relative; text-align: center; padding-top: 6px; }
    .progress-line { position: absolute; top: 16px; left: -50%; right: 50%; height: 2px; background: var(--border-default); }
    .progress-line--done { background: #10b981; }
    .progress-dot {
      position: relative; z-index: 1;
      width: 30px; height: 30px; border-radius: 50%; margin: 0 auto 6px;
      border: 2px solid var(--border-default); color: var(--text-tertiary); font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; background: var(--bg-card);
    }
    .progress-step--done .progress-dot { background: #10b981; border-color: #10b981; color: white; }
    .progress-step--active .progress-dot { background: var(--hul-primary); border-color: var(--hul-primary); color: white; }
    .progress-label { font-size: 11px; color: var(--text-tertiary); line-height: 1.3; }
    .progress-step--done .progress-label, .progress-step--active .progress-label { color: var(--text-primary); font-weight: 600; }
    .progress-date { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; font-family: var(--font-mono); }

    .agent-card {
      display: flex; align-items: center; gap: 12px;
      border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-subtle); padding: 12px 14px;
    }
    .agent-meta { flex: 1; min-width: 0; }
    .agent-vehicle { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 4px 10px; }

    .activity-card { border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px 16px; }
    .activity-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; }
    .empty-activity { font-size: 13px; color: var(--text-tertiary); }
    .activity-item { display: flex; gap: 10px; }
    .activity-left { width: 14px; display: flex; flex-direction: column; align-items: center; }
    .activity-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--hul-primary); margin-top: 4px; }
    .activity-dot--last { background: #10b981; }
    .activity-line { width: 2px; flex: 1; min-height: 16px; background: var(--border-default); margin: 4px 0; }
    .activity-body { padding-bottom: 14px; }
    .activity-status { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .activity-time { font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono); margin-top: 1px; }
    .activity-note { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .activity-place { font-size: 12px; color: var(--hul-primary); margin-top: 2px; }
  `]
})
export class LiveTrackingComponent implements OnInit, OnDestroy {
  loading = true;
  shipments: any[] = [];
  filtered: any[] = [];
  activeTab = 'All';
  tabs = [
    { label: 'All', value: 'All' },
    { label: 'Picked Up', value: 'PickedUp' },
    { label: 'In Transit', value: 'InTransit' },
    { label: 'Out for Delivery', value: 'OutForDelivery' }
  ];

  detailsOpen = false;
  detailsLoading = false;
  selectedShipment: any = null;
  selectedOrder: any = null;
  selectedTracking: any = null;
  activityEvents: Array<{ status: string; timestamp: string; note?: string | null; place?: string | null }> = [];

  readonly orderStages: OrderStage[] = [
    { key: 'Placed', label: 'Order Placed' },
    { key: 'OnHold', label: 'Order Received' },
    { key: 'Processing', label: 'Processing' },
    { key: 'ReadyForDispatch', label: 'Ready for Dispatch' },
    { key: 'AgentAssigned', label: 'Agent Assigned' },
    { key: 'InTransit', label: 'In Transit' },
    { key: 'OutForDelivery', label: 'Out for Delivery' },
    { key: 'Delivered', label: 'Delivered' }
  ];

  private readonly stageOrder: string[] = [
    'Placed', 'OnHold', 'Processing', 'ReadyForDispatch',
    'AgentAssigned', 'InTransit', 'OutForDelivery', 'Delivered'
  ];

  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private http: ZoneHttpService) {}

  ngOnInit(): void {
    this.load();
    this.refreshHandle = setInterval(() => {
      this.load(true);
      if (this.detailsOpen && this.selectedShipment?.orderId) {
        this.loadDetails(this.selectedShipment.orderId, true);
      }
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  load(silent = false): void {
    if (!silent) this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: s => {
        this.shipments = s.filter(x => x.status !== 'Delivered');
        this.applyFilter();
        if (!silent) this.loading = false;
      },
      error: () => {
        if (!silent) this.loading = false;
      }
    });
  }

  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filtered = this.activeTab === 'All'
      ? [...this.shipments]
      : this.shipments.filter(s => s.status === this.activeTab);
  }

  openDetails(shipment: any): void {
    this.selectedShipment = shipment;
    this.detailsOpen = true;
    this.loadDetails(shipment.orderId);
  }

  closeDetails(): void {
    this.detailsOpen = false;
    this.detailsLoading = false;
    this.selectedShipment = null;
    this.selectedOrder = null;
    this.selectedTracking = null;
    this.activityEvents = [];
  }

  private loadDetails(orderId: string, silent = false): void {
    if (!silent) this.detailsLoading = true;

    forkJoin({
      order: this.http.get<any>(API_ENDPOINTS.orders.orderById(orderId)),
      tracking: this.http.get<any>(API_ENDPOINTS.logistics.tracking(orderId)).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ order, tracking }) => {
        this.selectedOrder = order;
        this.selectedTracking = this.normalizeTracking(tracking);
        this.rebuildActivityEvents();
        if (!silent) this.detailsLoading = false;
      },
      error: () => {
        if (!silent) this.detailsLoading = false;
      }
    });
  }

  private normalizeTracking(raw: any): any {
    if (!raw) return null;

    const history = Array.isArray(raw.history)
      ? raw.history
      : Array.isArray(raw.trackingHistory) ? raw.trackingHistory : [];

    const currentStatus = raw.currentStatus || raw.status || null;

    return {
      ...raw,
      currentStatus,
      status: currentStatus,
      history
    };
  }

  private rebuildActivityEvents(): void {
    const orderEvents = (this.selectedOrder?.statusHistory || []).map((ev: any) => ({
      status: ev.toStatus || ev.status,
      timestamp: ev.changedAt || ev.timestamp,
      note: ev.notes || ev.note || null,
      place: null
    }));

    const trackingEvents = (this.selectedTracking?.history || []).map((ev: any) => ({
      status: ev.status,
      timestamp: ev.recordedAt,
      note: ev.notes || null,
      place: ev.place || null
    }));

    this.activityEvents = [...orderEvents, ...trackingEvents]
      .filter(ev => !!ev.status && !!ev.timestamp)
      .sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getCurrentStageIndex(): number {
    if (!this.selectedOrder) return -1;

    const trackingStatus = this.selectedTracking?.currentStatus;
    if (trackingStatus === 'Delivered') return this.stageOrder.indexOf('Delivered');
    if (trackingStatus === 'OutForDelivery') return this.stageOrder.indexOf('OutForDelivery');
    if (trackingStatus === 'AgentAssigned') return this.stageOrder.indexOf('AgentAssigned');
    if (trackingStatus === 'PickedUp' || trackingStatus === 'InTransit' || trackingStatus === 'VehicleBreakdown') {
      return this.stageOrder.indexOf('InTransit');
    }

    switch (this.selectedOrder.status) {
      case 'Delivered': return this.stageOrder.indexOf('Delivered');
      case 'InTransit': return this.stageOrder.indexOf('InTransit');
      case 'ReadyForDispatch': return this.stageOrder.indexOf('ReadyForDispatch');
      case 'Processing': return this.stageOrder.indexOf('Processing');
      case 'OnHold': return this.stageOrder.indexOf('OnHold');
      case 'Placed': return this.stageOrder.indexOf('Placed');
      default: return 0;
    }
  }

  isStageCompleted(key: string): boolean {
    const currentIdx = this.getCurrentStageIndex();
    const keyIdx = this.stageOrder.indexOf(key);
    return keyIdx < currentIdx;
  }

  isStageActive(key: string): boolean {
    const currentIdx = this.getCurrentStageIndex();
    const keyIdx = this.stageOrder.indexOf(key);
    return keyIdx === currentIdx;
  }

  getStageDate(key: string): string | null {
    const statusMap: Record<string, string[]> = {
      Placed: ['Placed'],
      OnHold: ['OnHold'],
      Processing: ['Processing'],
      ReadyForDispatch: ['ReadyForDispatch'],
      AgentAssigned: ['AgentAssigned'],
      InTransit: ['PickedUp', 'InTransit', 'VehicleBreakdown'],
      OutForDelivery: ['OutForDelivery'],
      Delivered: ['Delivered']
    };

    const statuses = statusMap[key] || [key];

    for (const ev of this.activityEvents) {
      if (statuses.includes(ev.status)) {
        return ev.timestamp;
      }
    }

    return null;
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      Placed: 'Order Placed',
      OnHold: 'On Hold',
      Processing: 'Processing',
      ReadyForDispatch: 'Ready for Dispatch',
      AgentAssigned: 'Agent Assigned',
      PickedUp: 'Picked Up',
      InTransit: 'In Transit',
      OutForDelivery: 'Out for Delivery',
      VehicleBreakdown: 'Vehicle Breakdown',
      Delivered: 'Delivered'
    };

    return map[status] || status;
  }

  formatIST(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

