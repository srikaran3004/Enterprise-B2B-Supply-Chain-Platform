import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';

@Component({
  selector: 'app-dispatch-queue', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Dispatch Queue" subtitle="Assign agents to orders ready for dispatch">
        <div page-actions>
          <div class="header-stat" *ngIf="!loading">
            <div class="header-stat__value">{{ orders.length }}</div>
            <div class="header-stat__label">Awaiting Dispatch</div>
          </div>
        </div>
      </hul-page-header>

      <!-- Summary Stat Cards -->
      <div class="stat-strip" *ngIf="!loading && orders.length > 0">
        <div class="stat-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>{{ uniqueRegions.length }} {{ uniqueRegions.length === 1 ? 'Region' : 'Regions' }}</span>
          </div>
        <div class="stat-chip stat-chip--warning" *ngIf="urgentCount > 0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{{ urgentCount }} Urgent SLA</span>
        </div>
      </div>

      <!-- Data Table -->
      <div style="margin-top: 16px;">
        <hul-data-table
          [columns]="columns"
          [data]="orders"
          [loading]="loading"
          [totalCount]="orders.length"
          [currentPage]="1"
          [pageSize]="50"
          [actions]="tableActions"
          searchPlaceholder="Search by order number, dealer, city..."
          emptyMessage="No orders awaiting dispatch. All caught up!"
          (searchChange)="onSearch($event)"
          (rowAction)="onAction($event)">
        </hul-data-table>
      </div>

      <!-- Smart Assignment Modal -->
      <hul-modal [isOpen]="showAssignModal" title="Assign Delivery Agent" size="lg" (closed)="closeModal()">
        <div class="modal-content" *ngIf="selectedOrder">
          <!-- Order Destination Header -->
          <div class="dest-header">
            <div class="dest-header__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="dest-header__info">
              <div class="dest-header__label">Delivery Destination</div>
              <div class="dest-header__city">{{ selectedOrder.shippingState || selectedOrder.shippingCity || selectedOrder.shippingPinCode || 'No Location' }}</div>
              <div class="dest-header__address">{{ selectedOrder.shippingAddressLine || selectedOrder.dealerName }}<span *ngIf="selectedOrder.shippingPinCode && selectedOrder.shippingAddressLine"> &mdash; {{ selectedOrder.shippingPinCode }}</span></div>
            </div>
            <div class="dest-header__order">
              <span class="dest-header__order-label">Order</span>
              <span class="dest-header__order-num">{{ selectedOrder.orderNumber }}</span>
            </div>
          </div>

          <!-- Consignment Info -->
          <div class="consignment-strip" *ngIf="selectedOrder">
            <div class="consignment-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span class="chip-lbl">Total Qty</span>
              <strong>{{ selectedOrderTotalQty }} units</strong>
            </div>
            <div class="consignment-chip consignment-chip--weight">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              <span class="chip-lbl">Est. Weight</span>
              <strong>~{{ selectedOrderApproxWeight }} kg</strong>
            </div>
          </div>

          <!-- Vehicle Selection -->
          <div class="section-label">Select Vehicle
            <span class="section-label__hint" *ngIf="selectedVehicleId && selectedVehicleCapacity">
              &nbsp;(Capacity: {{ selectedVehicleCapacity }} kg)
            </span>
            <span class="section-label__hint capacity-warn" *ngIf="capacityWarning">
              &nbsp;&#9888; Weight may exceed vehicle capacity
            </span>
          </div>
          <div class="vehicle-cards-wrap">
            <div *ngFor="let v of vehicles" class="vehicle-opt-card"
                 [class.vehicle-opt-card--selected]="selectedVehicleId === v.vehicleId"
                 [class.vehicle-opt-card--warn]="isCapacityInsufficient(v)"
                 (click)="selectedVehicleId = v.vehicleId">
              <div class="voc-radio">
                <div class="radio-outer"><div class="radio-inner" *ngIf="selectedVehicleId === v.vehicleId"></div></div>
              </div>
              <div class="voc-info">
                <div class="voc-regno">{{ v.registrationNo }}</div>
                <div class="voc-type">{{ v.vehicleType }}</div>
              </div>
              <div class="voc-cap" *ngIf="v.capacityKg">
                <div class="voc-cap__label">Max Load</div>
                <div class="voc-cap__value" [class.voc-cap__value--warn]="isCapacityInsufficient(v)">{{ v.capacityKg }} kg</div>
              </div>
              <div class="voc-cap" *ngIf="!v.capacityKg">
                <div class="voc-cap__label">Capacity</div>
                <div class="voc-cap__value" style="color:var(--text-tertiary)">N/A</div>
              </div>
            </div>
            <div *ngIf="vehicles.length === 0" class="no-vehicles">
              <p>No available vehicles. All vehicles are currently in use.</p>
            </div>
          </div>

          <!-- Agents Section -->
          <div class="section-label">
            Available Agents
            <span class="section-label__hint" *ngIf="!agentsLoading && regionAgents.length > 0">
              in {{ selectedOrder.shippingState || selectedOrder.shippingCity || selectedOrder.shippingPinCode || 'region' }}
            </span>
            <span class="section-label__hint" *ngIf="agentsLoading">Loading...</span>
          </div>

          <!-- Agents Loading -->
          <div *ngIf="agentsLoading" class="agents-loading">
            <div *ngFor="let i of [1,2,3]" class="agent-card agent-card--skeleton">
              <div class="skeleton" style="width:40px;height:40px;border-radius:50%"></div>
              <div style="flex:1">
                <div class="skeleton" style="width:60%;height:14px;border-radius:4px;margin-bottom:8px"></div>
                <div class="skeleton" style="width:40%;height:12px;border-radius:4px"></div>
              </div>
            </div>
          </div>

          <!-- No Agents Found -->
          <div *ngIf="!agentsLoading && regionAgents.length === 0" class="no-agents">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <p>No available agents in <strong>{{ selectedOrder.shippingState || selectedOrder.shippingCity || selectedOrder.shippingPinCode || 'this region' }}</strong></p>
            <button class="btn-text" (click)="loadAllAgents()">Show all available agents</button>
          </div>

          <!-- Agents List -->
          <div *ngIf="!agentsLoading && regionAgents.length > 0" class="agents-list">
            <div *ngFor="let agent of regionAgents" class="agent-card"
                 [class.agent-card--selected]="selectedAgentId === agent.agentId"
                 (click)="selectedAgentId = agent.agentId">
              <div class="agent-card__radio">
                <div class="radio-outer"><div class="radio-inner" *ngIf="selectedAgentId === agent.agentId"></div></div>
              </div>
              <hul-avatar [name]="agent.fullName" size="sm"></hul-avatar>
              <div class="agent-card__info">
                <div class="agent-card__name">{{ agent.fullName }}</div>
                <div class="agent-card__phone">{{ agent.phone }}</div>
              </div>
              <div class="agent-card__meta">
                <div class="agent-card__region">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ agent.serviceRegion || 'Unassigned' }}
                </div>
              </div>
              <div class="agent-card__stats">
                <div class="agent-card__rating" [class.agent-card__rating--high]="agent.averageRating >= 4" [class.agent-card__rating--mid]="agent.averageRating >= 2.5 && agent.averageRating < 4" [class.agent-card__rating--low]="agent.averageRating > 0 && agent.averageRating < 2.5">
                  <span *ngIf="agent.averageRating > 0" class="star-icon">\u2B50</span>
                  <span *ngIf="agent.averageRating > 0">{{ agent.averageRating }}</span>
                  <span *ngIf="agent.averageRating === 0" class="no-rating">New</span>
                </div>
                <div class="agent-card__deliveries">{{ agent.totalDeliveries }} {{ agent.totalDeliveries === 1 ? 'delivery' : 'deliveries' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div modal-footer class="modal-actions">
          <button class="btn btn--ghost" (click)="closeModal()">Cancel</button>
          <button class="btn btn--primary" [disabled]="!canAssign() || assigning" (click)="submitAssignment()">
            <span *ngIf="!assigning">Assign & Dispatch</span>
            <span *ngIf="assigning" class="spinner-wrap">
              <span class="spinner"></span> Assigning...
            </span>
          </button>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    /* ---------- Header Stat ---------- */
    .header-stat {
      text-align: right; padding: 8px 16px; background: var(--bg-card);
      border-radius: var(--radius-lg); border: 1px solid var(--border-default);
    }
    .header-stat__value { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--hul-primary); }
    .header-stat__label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }

    /* ---------- Stat Strip ---------- */
    .stat-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .stat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 9999px;
      font-size: 13px; font-weight: 500;
      background: var(--bg-card); color: var(--text-secondary);
      border: 1px solid var(--border-default);
    }
    .stat-chip--warning { background: #fffbeb; color: #d97706; border-color: #fde68a; }
    :host-context(.dark) .stat-chip--warning { background: rgba(217,119,6,.1); border-color: rgba(217,119,6,.3); }

    /* ---------- Modal Content ---------- */
    .modal-content { display: flex; flex-direction: column; gap: 16px; }
    .dest-header {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px; border-radius: var(--radius-lg);
      background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
      border: 1px solid #bae6fd;
    }
    :host-context(.dark) .dest-header {
      background: linear-gradient(135deg, rgba(14,165,233,.08) 0%, rgba(16,185,129,.08) 100%);
      border-color: rgba(14,165,233,.2);
    }
    .dest-header__icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--hul-primary); color: white;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .dest-header__info { flex: 1; min-width: 0; }
    .dest-header__label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); margin-bottom: 2px; }
    .dest-header__city { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .dest-header__address { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
    .dest-header__order { text-align: right; flex-shrink: 0; }
    .dest-header__order-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); }
    .dest-header__order-num { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--hul-primary); }

    /* ---------- Section Labels ---------- */
    .section-label {
      font-size: 13px; font-weight: 600; color: var(--text-primary);
      display: flex; align-items: center; gap: 8px;
    }
    .section-label__hint { font-weight: 400; color: var(--text-tertiary); font-size: 12px; }

    /* ---------- Consignment Strip ---------- */
    .consignment-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .consignment-chip {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: var(--radius-lg);
      background: var(--bg-subtle); border: 1px solid var(--border-default);
      font-size: 13px; color: var(--text-secondary);
    }
    .consignment-chip--weight { border-color: #bae6fd; background: #f0f9ff; color: #0369a1; }
    :host-context(.dark) .consignment-chip--weight { background: rgba(3,105,161,.1); border-color: rgba(3,105,161,.3); color: #7dd3fc; }
    .chip-lbl { font-size: 12px; color: var(--text-tertiary); }

    /* ---------- Vehicle Cards ---------- */
    .vehicle-cards-wrap { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; }
    .vehicle-opt-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: var(--radius-lg);
      border: 2px solid var(--border-default); background: var(--bg-card);
      cursor: pointer; transition: all var(--duration-fast);
    }
    .vehicle-opt-card:hover { border-color: var(--hul-primary); background: var(--bg-muted); }
    .vehicle-opt-card--selected { border-color: var(--hul-primary); background: rgba(3,105,161,.06); }
    .vehicle-opt-card--warn { border-color: #fca5a5; }
    .voc-radio { flex-shrink: 0; }
    .voc-info { flex: 1; }
    .voc-regno { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .voc-type { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
    .voc-cap { text-align: right; flex-shrink: 0; }
    .voc-cap__label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: .04em; }
    .voc-cap__value { font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
    .voc-cap__value--warn { color: #dc2626; }
    .no-vehicles { text-align: center; padding: 20px; color: var(--text-tertiary); font-size: 14px; }
    .capacity-warn { color: #dc2626 !important; font-weight: 600; }

    /* ---------- Agents List ---------- */
    .agents-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px; }
    .agents-loading { display: flex; flex-direction: column; gap: 8px; }
    .agent-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: var(--radius-lg);
      border: 2px solid var(--border-default); background: var(--bg-card);
      cursor: pointer; transition: all var(--duration-fast) var(--ease-out);
    }
    .agent-card:hover { border-color: var(--hul-primary); background: var(--bg-muted); }
    .agent-card--selected {
      border-color: var(--hul-primary);
      background: rgba(3,105,161,.08);
      box-shadow: 0 0 0 3px rgba(3,105,161,.12);
    }
    :host-context(.dark) .agent-card--selected { background: rgba(14,165,233,.12); }
    .agent-card--skeleton { pointer-events: none; }

    .agent-card__radio { flex-shrink: 0; }
    .radio-outer {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid var(--border-default); display: flex;
      align-items: center; justify-content: center;
      transition: border-color var(--duration-fast);
    }
    .agent-card--selected .radio-outer { border-color: var(--hul-primary); }
    .radio-inner { width: 10px; height: 10px; border-radius: 50%; background: var(--hul-primary); animation: scaleIn 150ms var(--ease-out); }
    @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }

    .agent-card__info { flex: 1; min-width: 0; }
    .agent-card__name { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-card--selected .agent-card__name { color: #0c4a6e; }
    :host-context(.dark) .agent-card--selected .agent-card__name { color: #7dd3fc; }
    .agent-card__phone { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .agent-card--selected .agent-card__phone { color: #0369a1; }
    :host-context(.dark) .agent-card--selected .agent-card__phone { color: #bae6fd; }

    .agent-card__meta { flex-shrink: 0; }
    .agent-card__region {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--text-secondary);
      padding: 3px 8px; border-radius: 9999px;
      background: var(--bg-muted);
    }
    .agent-card--selected .agent-card__region { background: rgba(3,105,161,.12); color: #0369a1; }
    :host-context(.dark) .agent-card--selected .agent-card__region { background: rgba(14,165,233,.15); color: #7dd3fc; }

    .agent-card__stats { flex-shrink: 0; text-align: right; }
    .agent-card__rating { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .agent-card__rating--high { color: #059669; }
    .agent-card__rating--mid { color: #d97706; }
    .agent-card__rating--low { color: #ef4444; }
    .star-icon { font-size: 14px; margin-right: 2px; }
    .no-rating { font-size: 12px; font-weight: 500; color: var(--text-tertiary); padding: 2px 8px; background: var(--bg-muted); border-radius: 9999px; }
    .agent-card__deliveries { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

    /* ---------- No Agents ---------- */
    .no-agents {
      text-align: center; padding: 32px 16px;
      color: var(--text-tertiary);
    }
    .no-agents svg { margin: 0 auto 12px; display: block; opacity: .5; }
    .no-agents p { font-size: 14px; margin: 0 0 12px; }
    .btn-text {
      background: none; border: none; color: var(--hul-primary);
      font-size: 13px; font-weight: 600; cursor: pointer;
      text-decoration: underline; font-family: var(--font-body);
    }
    .btn-text:hover { color: var(--hul-primary-hover); }

    /* ---------- Modal Actions ---------- */
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn {
      padding: 10px 24px; border-radius: var(--radius-lg);
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--font-body);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); color: var(--text-primary); }
    .btn--primary { background: var(--hul-primary); color: white; min-width: 160px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .btn--primary:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .spinner-wrap { display: inline-flex; align-items: center; gap: 8px; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: white; border-radius: 50%;
      animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ---------- Skeletons ---------- */
    .skeleton {
      background: linear-gradient(90deg, var(--bg-muted) 0%, var(--bg-subtle) 50%, var(--bg-muted) 100%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `]
})
export class DispatchQueueComponent implements OnInit {
  loading = true;
  orders: any[] = [];
  allOrders: any[] = [];
  vehicles: any[] = [];
  searchTerm = '';
  /** OrderIds that already have an active Logistics shipment */
  private activeShipmentOrderIds = new Set<string>();

  // Modal state
  showAssignModal = false;
  selectedOrder: any = null;
  selectedAgentId = '';
  selectedVehicleId = '';
  regionAgents: any[] = [];
  agentsLoading = false;
  assigning = false;

  columns: DataTableColumn[] = [
    { key: 'orderNumber', label: 'Order #', type: 'text', sortable: true },
    { key: 'dealerName', label: 'Dealer', type: 'text', sortable: true },
    { key: 'shippingCity', label: 'Ship To City', type: 'text', sortable: true },
    { key: 'shippingPinCode', label: 'Pin Code', type: 'text' },
    { key: 'totalAmount', label: 'Amount', type: 'currency-inr', sortable: true },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'ReadyForDispatch': 'success', 'Processing': 'primary', 'Placed': 'info', 'OnHold': 'warning' } },
    { key: 'placedAt', label: 'Placed', type: 'date', sortable: true },
    { key: 'actions', label: '', type: 'actions-menu' },
  ];

  tableActions: DataTableAction[] = [
    { key: 'assign', label: 'Assign Agent', variant: 'primary' },
  ];

  get uniqueRegions(): string[] {
    return [...new Set(this.orders.map(o => o.shippingState || o.shippingCity).filter(Boolean))];
  }

  get urgentCount(): number {
    return this.orders.filter(o => {
      if (!o.slaDeadlineUtc) return false;
      const hrs = (new Date(o.slaDeadlineUtc).getTime() - Date.now()) / 3600000;
      return hrs < 24;
    }).length;
  }

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadOrdersAndShipments();
    this.loadVehicles();
  }

  /** Loads orders and active shipments together so we can cross-reference */
  loadOrdersAndShipments(): void {
    this.loading = true;
    // First load the active shipments from Logistics so we know which orderIds
    // already have a shipment (they must be excluded from the dispatch queue).
    this.http.get<any[]>(API_ENDPOINTS.logistics.pendingShipments()).subscribe({
      next: shipments => {
        this.activeShipmentOrderIds = new Set(
          (shipments || []).map((s: any) => s.orderId)
        );
        this.loadOrders();
      },
      error: () => {
        // If logistics is unreachable, still load orders without cross-reference
        this.activeShipmentOrderIds = new Set();
        this.loadOrders();
      }
    });
  }

  loadOrders(): void {
    this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=200').subscribe({
      next: response => {
        const items = response.items || response || [];
        const dispatchableStatuses = ['Placed', 'OnHold', 'Processing', 'ReadyForDispatch'];
        this.allOrders = items.filter((o: any) =>
          dispatchableStatuses.includes(o.status) &&
          o.paymentStatus === 'Paid' &&
          !this.activeShipmentOrderIds.has(o.orderId)
        );
        this.applySearch();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadVehicles(): void {
    this.http.get<any[]>(API_ENDPOINTS.logistics.vehicles()).subscribe({
      next: v => this.vehicles = v.filter((x: any) => x.status === 'Available'),
      error: () => {}
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applySearch();
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.orders = [...this.allOrders];
    } else {
      const s = this.searchTerm.toLowerCase();
      this.orders = this.allOrders.filter(o =>
        o.orderNumber?.toLowerCase().includes(s) ||
        o.dealerName?.toLowerCase().includes(s) ||
        o.shippingCity?.toLowerCase().includes(s) ||
        o.shippingPinCode?.toLowerCase().includes(s)
      );
    }
  }

  onAction(e: any): void {
    if (e.action === 'assign') {
      this.openAssignModal(e.row);
    }
  }

  openAssignModal(order: any): void {
    this.selectedOrder = order;
    this.selectedAgentId = '';
    this.selectedVehicleId = '';
    this.regionAgents = [];
    this.showAssignModal = true;
    // Prefer state (broadest match) -> city -> no region filter (load all)
    this.loadRegionAgents(order.shippingState || order.shippingCity || '');
  }

  closeModal(): void {
    this.showAssignModal = false;
    this.selectedOrder = null;
    this.selectedAgentId = '';
    this.selectedVehicleId = '';
    this.regionAgents = [];
  }

  loadRegionAgents(city: string): void {
    this.agentsLoading = true;
    const url = city
      ? API_ENDPOINTS.logistics.availableAgents() + '?region=' + encodeURIComponent(city)
      : API_ENDPOINTS.logistics.availableAgents();
    this.http.get<any[]>(url).subscribe({
      next: agents => {
        this.regionAgents = agents.filter((a: any) => a.status === 'Available');
        this.agentsLoading = false;
      },
      error: () => { this.agentsLoading = false; }
    });
  }

  loadAllAgents(): void {
    this.agentsLoading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.availableAgents()).subscribe({
      next: agents => {
        this.regionAgents = agents.filter((a: any) => a.status === 'Available');
        this.agentsLoading = false;
      },
      error: () => { this.agentsLoading = false; }
    });
  }

  canAssign(): boolean {
    return !!this.selectedAgentId && !!this.selectedVehicleId;
  }

  get selectedOrderTotalQty(): number {
    return (this.selectedOrder?.lines || []).reduce((s: number, l: any) => s + (l.quantity || 0), 0);
  }

  /** Approximate weight: 0.5 kg per unit (configurable constant) */
  get selectedOrderApproxWeight(): string {
    const kg = this.selectedOrderTotalQty * 0.5;
    return kg.toFixed(1);
  }

  get selectedVehicleCapacity(): number | null {
    if (!this.selectedVehicleId) return null;
    const v = this.vehicles.find((x: any) => x.vehicleId === this.selectedVehicleId);
    return v?.capacityKg ?? null;
  }

  get capacityWarning(): boolean {
    const cap = this.selectedVehicleCapacity;
    if (cap === null) return false;
    return parseFloat(this.selectedOrderApproxWeight) > cap;
  }

  isCapacityInsufficient(v: any): boolean {
    if (!v.capacityKg) return false;
    return parseFloat(this.selectedOrderApproxWeight) > v.capacityKg;
  }

  submitAssignment(): void {
    if (!this.canAssign() || !this.selectedOrder) return;
    this.assigning = true;

    // Default SLA = 72 hours from now. The backend will auto-create a Shipment
    // row if one doesn't exist yet (idempotent upsert in AssignAgentCommandHandler).
    const slaDeadlineUtc = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const payload = {
      orderId: this.selectedOrder.orderId,
      agentId: this.selectedAgentId,
      vehicleId: this.selectedVehicleId,
      slaDeadlineUtc
    };

    this.http.post(API_ENDPOINTS.logistics.assignAgent(), payload).subscribe({
      next: () => {
        this.toast.success('Agent assigned successfully. Dealer & agent notified.');
        // Instantly remove from local list
        this.allOrders = this.allOrders.filter(o => o.orderId !== this.selectedOrder.orderId);
        this.applySearch();
        this.closeModal();
        this.assigning = false;
        // Refresh vehicles (one may now be in use)
        this.loadVehicles();
      },
      error: err => {
        const apiMessage = err?.error?.error?.message
          || err?.error?.error
          || err?.error?.message
          || err?.message
          || 'Assignment failed';
        this.toast.error(apiMessage);
        this.assigning = false;
      }
    });
  }
}
