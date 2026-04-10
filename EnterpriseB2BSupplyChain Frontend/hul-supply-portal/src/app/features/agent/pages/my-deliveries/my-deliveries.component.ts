import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-my-deliveries', standalone: false,
  template: `
    <div class="deliveries-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header__text">
          <h1 class="page-title">My Deliveries</h1>
          <p class="page-sub">Manage your assigned shipments and update delivery status</p>
        </div>
        <button class="refresh-btn" (click)="load()" [disabled]="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.spin]="loading">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div>
            <div class="stat-value">{{ deliveries.length }}</div>
            <div class="stat-label">Total Assigned</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div class="stat-value">{{ activeCount }}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div class="stat-value">{{ deliveredCount }}</div>
            <div class="stat-label">Delivered</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="stat-value">{{ slaRiskCount }}</div>
            <div class="stat-label">SLA At Risk</div>
          </div>
        </div>
      </div>

      <!-- Tab filter -->
      <div class="tab-bar">
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'active'" (click)="activeTab = 'active'">
          Active <span class="tab-count" *ngIf="activeCount">{{ activeCount }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'delivered'" (click)="activeTab = 'delivered'">
          Delivered <span class="tab-count tab-count--green" *ngIf="deliveredCount">{{ deliveredCount }}</span>
        </button>
        <button class="tab-btn" [class.tab-btn--active]="activeTab === 'all'" (click)="activeTab = 'all'">All</button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-grid">
        <div *ngFor="let i of [1,2]" class="skeleton-card">
          <div class="skel-line skel-line--w50"></div>
          <div class="skel-line skel-line--w80"></div>
          <div class="skel-line skel-line--w60"></div>
        </div>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && filteredDeliveries.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <p>{{ activeTab === 'delivered' ? 'No delivered orders yet.' : 'No active deliveries.' }}</p>
      </div>

      <!-- Delivery Cards -->
      <div *ngIf="!loading" class="deliveries-grid">
        <div *ngFor="let s of filteredDeliveries" class="delivery-card"
             [class.delivery-card--delivered]="s.status === 'Delivered'"
             [class.delivery-card--risk]="s.slaAtRisk && s.status !== 'Delivered'"
             [class.delivery-card--breakdown]="s.status === 'VehicleBreakdown'">

          <!-- Card Top Bar -->
          <div class="dc-topbar">
            <div class="dc-topbar__left">
              <span class="dc-order-badge"># {{ (s.orderId + '').substring(0, 8).toUpperCase() }}</span>
              <span class="dc-status-pill" [ngClass]="getStatusPillClass(s.status)">{{ getStatusLabel(s.status) }}</span>
            </div>
            <div class="dc-topbar__right">
              <span *ngIf="s.slaAtRisk && s.status !== 'Delivered'" class="sla-risk-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                SLA Risk
              </span>
              <span class="dc-sla-date" *ngIf="!s.slaAtRisk && s.slaDeadlineUtc">SLA {{ s.slaDeadlineUtc | date:'dd MMM' }}</span>
            </div>
          </div>

          <!-- Vehicle info bar -->
          <div *ngIf="s.vehicleRegistrationNo" class="dc-vehicle-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span>{{ s.vehicleType }}</span>
            <span class="dc-regplate">{{ s.vehicleRegistrationNo }}</span>
          </div>

          <!-- Delivery details grid -->
          <div class="dc-details">
            <div class="dc-detail-block">
              <div class="dc-detail-label">Deliver To</div>
              <div class="dc-detail-value dc-detail-value--strong">{{ s.dealerName || 'Dealer' }}</div>
              <div class="dc-detail-value" *ngIf="s.dealerPhone">
                <a [href]="'tel:' + s.dealerPhone" class="dc-phone-link">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44 2 2 0 0 1 3.6 2.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ s.dealerPhone }}
                </a>
              </div>
            </div>
            <div class="dc-detail-block">
              <div class="dc-detail-label">Delivery Address</div>
              <div class="dc-detail-value dc-detail-value--address">
                {{ s.shippingAddress || '—' }}<br *ngIf="s.shippingAddress"/>
                {{ s.shippingCity }}<span *ngIf="s.shippingCity && s.shippingState">, </span>{{ s.shippingState }}
                <span *ngIf="s.shippingPinCode" class="dc-pin"> — {{ s.shippingPinCode }}</span>
              </div>
            </div>
          </div>

          <!-- Tracking history (last 3 events) -->
          <div *ngIf="s.trackingHistory?.length > 0" class="dc-history">
            <div class="dc-history__title">Recent Updates</div>
            <div *ngFor="let ev of getRecentHistory(s)" class="dc-history__item"
                 [class.dc-history__item--breakdown]="ev['status'] === 'VehicleBreakdown'">
              <div class="dc-history__dot"></div>
              <span class="dc-history__status">{{ ev['status'] }}</span>
              <span *ngIf="ev['place']" class="dc-history__place">@ {{ ev['place'] }}</span>
              <span class="dc-history__time">{{ ev['recordedAt'] | date:'dd MMM, h:mm a':'Asia/Kolkata' }}</span>
            </div>
          </div>

          <!-- Rating (delivered only) -->
          <div *ngIf="s.status === 'Delivered' && s.customerRating" class="dc-rating">
            <div class="dc-rating__stars">
              <span *ngFor="let i of [1,2,3,4,5]" [class.filled]="i <= s.customerRating">★</span>
            </div>
            <span class="dc-rating__label">Customer rated {{ s.customerRating }}/5</span>
            <span *ngIf="s.customerFeedback" class="dc-rating__feedback">"{{ s.customerFeedback }}"</span>
          </div>

          <!-- Delivered stamp -->
          <div *ngIf="s.status === 'Delivered' && !s.customerRating" class="dc-delivered-stamp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Delivered on {{ s.deliveredAt | date:'dd MMM yyyy':'Asia/Kolkata' }}
          </div>

          <!-- Action Panel (active only) -->
          <div *ngIf="s.status !== 'Delivered'" class="dc-action-panel">
            <div class="dc-action-divider"></div>

            <!-- Pickup confirmation -->
            <div *ngIf="s.status === 'AgentAssigned'" class="dc-pickup-section">
              <div class="dc-pickup-prompt">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>Order ready for pickup at warehouse</span>
              </div>
              <button class="dc-btn dc-btn--primary" (click)="quickUpdate(s, 'PickedUp')"
                [disabled]="updatingId === s.shipmentId">
                {{ updatingId === s.shipmentId ? 'Confirming…' : 'Confirm Pickup' }}
              </button>
            </div>

            <!-- Update status panel -->
            <div *ngIf="s.status !== 'AgentAssigned'" class="dc-update-section">
              <div class="dc-update-title">Update Delivery Status</div>
              <div class="dc-status-options">
                <button *ngFor="let opt of statusOptions" class="dc-status-opt"
                  [class.dc-status-opt--active]="s._updateStatus === opt.value"
                  [class.dc-status-opt--danger]="opt.danger"
                  [class.dc-status-opt--deliver]="opt.deliver"
                  (click)="s._updateStatus = opt.value; s._place = ''; s._notes = ''">
                  <span class="dc-status-opt__icon" [innerHTML]="opt.icon"></span>
                  {{ opt.label }}
                </button>
              </div>

              <!-- Place input -->
              <input *ngIf="s._updateStatus && s._updateStatus !== 'VehicleBreakdown'"
                type="text" class="dc-input"
                [(ngModel)]="s._place"
                placeholder="Current location (optional, e.g. Pune Bypass, Nashik Highway)" />

              <!-- Breakdown inputs -->
              <div *ngIf="s._updateStatus === 'VehicleBreakdown'" class="dc-breakdown-form">
                <input type="text" class="dc-input"
                  [(ngModel)]="s._place"
                  placeholder="Where did breakdown occur? (e.g. NH-48, Pune)" />
                <textarea class="dc-textarea" [(ngModel)]="s._notes" rows="2"
                  placeholder="Breakdown details (e.g. tyre flat, engine issue, fuel problem)"></textarea>
              </div>

              <div class="dc-submit-row" *ngIf="s._updateStatus">
                <button class="dc-btn"
                  [class.dc-btn--primary]="s._updateStatus !== 'Delivered' && s._updateStatus !== 'VehicleBreakdown'"
                  [class.dc-btn--deliver]="s._updateStatus === 'Delivered'"
                  [class.dc-btn--danger]="s._updateStatus === 'VehicleBreakdown'"
                  [disabled]="!canSubmitUpdate(s)"
                  (click)="submitUpdate(s)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="s._updateStatus === 'Delivered'"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="s._updateStatus === 'VehicleBreakdown'"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                  {{ updatingId === s.shipmentId ? 'Sending…' : getSubmitLabel(s._updateStatus) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .deliveries-page { max-width: 1200px; animation: fadeIn 200ms ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

    /* Page Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-sub { font-size: 14px; color: var(--text-tertiary); margin: 0; }
    .refresh-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-family: var(--font-body); transition: all var(--duration-fast); }
    .refresh-btn:hover:not(:disabled) { border-color: var(--hul-primary); color: var(--hul-primary); background: var(--hul-primary-light); }
    .refresh-btn:disabled { opacity: .4; cursor: not-allowed; }
    .spin { animation: spin 0.8s linear infinite; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-card); display: flex; align-items: center; gap: 16px; border: 1px solid var(--border-default); }
    .stat-icon { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon--blue { background: rgba(59,130,246,.12); color: #3b82f6; }
    .stat-icon--orange { background: rgba(249,115,22,.12); color: #f97316; }
    .stat-icon--green { background: rgba(16,185,129,.12); color: #10b981; }
    .stat-icon--red { background: rgba(239,68,68,.12); color: #ef4444; }
    .stat-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

    /* Tab bar */
    .tab-bar { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border-default); padding-bottom: 0; }
    .tab-btn { padding: 10px 20px; background: none; border: none; border-bottom: 3px solid transparent; font-size: 14px; font-weight: 600; color: var(--text-tertiary); cursor: pointer; font-family: var(--font-body); transition: all var(--duration-fast); display: flex; align-items: center; gap: 6px; margin-bottom: -1px; }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn--active { color: var(--hul-primary); border-bottom-color: var(--hul-primary); }
    .tab-count { padding: 1px 7px; border-radius: 9999px; font-size: 11px; background: var(--hul-primary-light); color: var(--hul-primary); }
    .tab-count--green { background: rgba(16,185,129,.1); color: #059669; }

    /* Loading */
    .loading-grid { display: flex; flex-direction: column; gap: 16px; }
    .skeleton-card { height: 220px; border-radius: var(--radius-lg); background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 12px; animation: shimmer 1.5s infinite; border: 1px solid var(--border-default); }
    .skel-line { height: 14px; border-radius: 7px; background: var(--bg-muted); }
    .skel-line--w50 { width: 50%; }
    .skel-line--w80 { width: 80%; }
    .skel-line--w60 { width: 60%; }

    /* Empty */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 20px; text-align: center; }
    .empty-state p { font-size: 16px; font-weight: 600; color: var(--text-secondary); margin: 0; }

    /* Delivery Cards */
    .deliveries-grid { display: flex; flex-direction: column; gap: 20px; }

    .delivery-card {
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border-default);
      border-left: 5px solid var(--hul-primary);
      overflow: hidden;
      transition: box-shadow var(--duration-fast), transform var(--duration-fast);
    }
    .delivery-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .delivery-card--delivered { border-left-color: #10b981; opacity: .85; }
    .delivery-card--risk { border-left-color: #ef4444; }
    .delivery-card--breakdown { border-left-color: #f97316; }

    /* Top bar */
    .dc-topbar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px 12px; border-bottom: 1px solid var(--border-default);
      background: var(--bg-subtle);
    }
    .dc-topbar__left { display: flex; align-items: center; gap: 10px; }
    .dc-order-badge { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text-primary); background: var(--bg-card); border: 1px solid var(--border-default); padding: 3px 10px; border-radius: var(--radius-md); }
    .dc-status-pill { padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .dc-status-pill--blue { background: #dbeafe; color: #1d4ed8; }
    .dc-status-pill--orange { background: #ffedd5; color: #c2410c; }
    .dc-status-pill--green { background: #d1fae5; color: #065f46; }
    .dc-status-pill--red { background: #fee2e2; color: #991b1b; }
    .dc-status-pill--gray { background: var(--bg-muted); color: var(--text-secondary); }
    .dc-topbar__right { display: flex; align-items: center; gap: 8px; }
    .sla-risk-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: #fee2e2; color: #dc2626; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .dc-sla-date { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

    /* Vehicle bar */
    .dc-vehicle-bar { display: flex; align-items: center; gap: 8px; padding: 8px 24px; background: linear-gradient(90deg, rgba(3,105,161,.06), transparent); font-size: 13px; color: var(--text-secondary); border-bottom: 1px solid var(--border-default); }
    .dc-regplate { font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); background: var(--bg-subtle); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-default); }

    /* Details grid */
    .dc-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 20px 24px; }
    .dc-detail-block { padding-right: 20px; }
    .dc-detail-block:last-child { padding-right: 0; border-left: 1px solid var(--border-default); padding-left: 20px; }
    .dc-detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 6px; }
    .dc-detail-value { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
    .dc-detail-value--strong { font-weight: 600; color: var(--text-primary); font-size: 15px; }
    .dc-detail-value--address { font-size: 13px; }
    .dc-pin { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); }
    .dc-phone-link { display: inline-flex; align-items: center; gap: 4px; color: var(--hul-primary); text-decoration: none; font-weight: 600; font-family: var(--font-mono); }
    .dc-phone-link:hover { text-decoration: underline; }

    /* History */
    .dc-history { padding: 12px 24px 0; }
    .dc-history__title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 8px; }
    .dc-history__item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 3px 0; }
    .dc-history__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--hul-primary); flex-shrink: 0; }
    .dc-history__item--breakdown .dc-history__dot { background: #f97316; }
    .dc-history__status { font-weight: 600; color: var(--text-primary); }
    .dc-history__place { color: var(--hul-primary); }
    .dc-history__time { color: var(--text-tertiary); margin-left: auto; font-family: var(--font-mono); font-size: 11px; }

    /* Rating */
    .dc-rating { display: flex; align-items: center; gap: 10px; padding: 12px 24px; background: #fef9c3; border-top: 1px solid #fde68a; }
    .dc-rating__stars { font-size: 18px; letter-spacing: 2px; }
    .dc-rating__stars span { color: #d1d5db; }
    .dc-rating__stars span.filled { color: #f59e0b; }
    .dc-rating__label { font-size: 13px; font-weight: 600; color: #92400e; }
    .dc-rating__feedback { font-size: 12px; color: #78350f; font-style: italic; }

    /* Delivered stamp */
    .dc-delivered-stamp { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #d1fae5; color: #065f46; font-size: 13px; font-weight: 600; border-top: 1px solid #a7f3d0; }

    /* Action panel */
    .dc-action-panel { padding: 20px 24px 24px; }
    .dc-action-divider { height: 1px; background: var(--border-default); margin-bottom: 16px; }

    /* Pickup section */
    .dc-pickup-section { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: var(--hul-primary-light); border: 1px solid rgba(3,105,161,.2); border-radius: var(--radius-lg); padding: 16px 20px; }
    .dc-pickup-prompt { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--hul-primary); }

    /* Update section */
    .dc-update-section { }
    .dc-update-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; }
    .dc-status-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .dc-status-opt {
      padding: 8px 16px; border-radius: var(--radius-lg); border: 1.5px solid var(--border-default);
      background: var(--bg-subtle); color: var(--text-secondary); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: var(--font-body); transition: all var(--duration-fast);
      display: flex; align-items: center; gap: 6px;
    }
    .dc-status-opt:hover { border-color: var(--hul-primary); color: var(--hul-primary); background: var(--hul-primary-light); }
    .dc-status-opt--active { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }
    .dc-status-opt--danger { border-color: #fca5a5; color: #dc2626; }
    .dc-status-opt--danger:hover, .dc-status-opt--danger.dc-status-opt--active { background: #ef4444; color: white; border-color: #ef4444; }
    .dc-status-opt--deliver { border-color: #6ee7b7; color: #059669; }
    .dc-status-opt--deliver:hover, .dc-status-opt--deliver.dc-status-opt--active { background: #10b981; color: white; border-color: #10b981; }
    .dc-status-opt__icon { line-height: 1; }

    .dc-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body); box-sizing: border-box; margin-bottom: 10px; }
    .dc-input:focus { outline: none; border-color: var(--hul-primary); }
    .dc-input::placeholder { color: var(--text-disabled); }
    .dc-textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body); resize: vertical; box-sizing: border-box; margin-bottom: 10px; }
    .dc-textarea:focus { outline: none; border-color: var(--hul-primary); }
    .dc-breakdown-form { display: flex; flex-direction: column; gap: 0; }

    .dc-submit-row { }
    .dc-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 24px; border: none; border-radius: var(--radius-lg);
      font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
      transition: all var(--duration-fast);
    }
    .dc-btn:disabled { opacity: .5; cursor: not-allowed; }
    .dc-btn--primary { background: var(--hul-primary); color: white; }
    .dc-btn--primary:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .dc-btn--deliver { background: #10b981; color: white; }
    .dc-btn--deliver:hover:not(:disabled) { background: #059669; }
    .dc-btn--danger { background: #ef4444; color: white; }
    .dc-btn--danger:hover:not(:disabled) { background: #dc2626; }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .dc-details { grid-template-columns: 1fr; }
      .dc-detail-block:last-child { border-left: none; padding-left: 0; border-top: 1px solid var(--border-default); padding-top: 16px; margin-top: 8px; }
      .dc-pickup-section { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class MyDeliveriesComponent implements OnInit {
  loading = true;
  deliveries: any[] = [];
  updatingId: string | null = null;
  activeTab: 'active' | 'delivered' | 'all' = 'active';

  readonly statusOptions = [
    { value: 'Started',          label: 'Started Journey',     icon: '🚀', danger: false, deliver: false, color: 'blue'   },
    { value: 'Reached',          label: 'Reached Hub/Dest.',   icon: '📍', danger: false, deliver: false, color: 'blue'   },
    { value: 'OutForDelivery',   label: 'Out for Delivery',    icon: '📦', danger: false, deliver: false, color: 'blue'   },
    { value: 'Delayed',          label: 'Delay (Traffic)',     icon: '⏱',  danger: false, deliver: false, color: 'yellow' },
    { value: 'Delivered',        label: 'Mark as Delivered',   icon: '✅', danger: false, deliver: true,  color: 'green'  },
    { value: 'VehicleBreakdown', label: 'Vehicle Breakdown',   icon: '🚨', danger: true,  deliver: false, color: 'red'    },
    { value: 'Other',            label: 'Custom Update',       icon: '📝', danger: false, deliver: false, color: 'gray'   },
  ];

  get deliveredCount() { return this.deliveries.filter(d => d.status === 'Delivered').length; }
  get activeCount()    { return this.deliveries.filter(d => d.status !== 'Delivered').length; }
  get slaRiskCount()   { return this.deliveries.filter(d => d.slaAtRisk && d.status !== 'Delivered').length; }

  get filteredDeliveries() {
    if (this.activeTab === 'active')    return this.deliveries.filter(d => d.status !== 'Delivered');
    if (this.activeTab === 'delivered') return this.deliveries.filter(d => d.status === 'Delivered');
    return this.deliveries;
  }

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.myShipments()).subscribe({
      next: s => {
        this.deliveries = s
          .map(d => ({ ...d, _updateStatus: '', _place: '', _notes: '' }))
          .sort((a, b) => (a.status === 'Delivered' ? 1 : 0) - (b.status === 'Delivered' ? 1 : 0));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  quickUpdate(d: any, status: string): void {
    this.updatingId = d.shipmentId;
    this.http.put(API_ENDPOINTS.logistics.updateShipmentStatus(d.orderId), {
      status,
      place: d.shippingCity || d.shippingState || null,
      notes: 'Goods picked up from warehouse'
    }).subscribe({
      next: () => { this.toast.success('Pickup confirmed!'); this.updatingId = null; this.load(); },
      error: err => { this.toast.error(err.error?.error || 'Update failed'); this.updatingId = null; }
    });
  }

  /** Format UTC date to IST display string */
  formatIST(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  getSubmitLabel(status: string): string {
    const map: Record<string, string> = {
      Started:          'Submit: Started Journey',
      Reached:          'Submit: Reached Destination',
      OutForDelivery:   'Submit: Out for Delivery',
      Delayed:          'Report Delay',
      Delivered:        'Confirm Delivery',
      VehicleBreakdown: 'Report Breakdown',
      Other:            'Submit Update',
    };
    return map[status] || 'Submit Update';
  }

  submitUpdate(d: any): void {
    const status = d._updateStatus;
    if (!status || !this.canSubmitUpdate(d)) return;

    const statusMap: Record<string, string> = {
      Started:          'InTransit',
      Reached:          'InTransit',
      OutForDelivery:   'OutForDelivery',
      Delayed:          'InTransit',
      Delivered:        'Delivered',
      VehicleBreakdown: 'VehicleBreakdown',
      Other:            'InTransit',
    };
    const apiStatus = statusMap[status] || status;

    this.updatingId = d.shipmentId;
    const labelMap: Record<string, string> = {
      Started: 'Journey started', Reached: 'Reached destination',
      Delayed: 'Delay reported', OutForDelivery: 'Out for delivery'
    };
    const typedNotes = (d._notes || '').trim();
    const notes = typedNotes
      || (status !== 'Other' && status !== 'Delivered' ? (labelMap[status] || status) : null)
      || null;
    const place = this.resolvePlace(d);

    this.http.put(API_ENDPOINTS.logistics.updateShipmentStatus(d.orderId), {
      status: apiStatus,
      notes,
      place,
    }).subscribe({
      next: () => {
        const msgs: Record<string, string> = {
          VehicleBreakdown: 'Breakdown reported. Dealer has been notified.',
          Delivered:        'Delivery confirmed! Great work.',
          OutForDelivery:   'Marked as out for delivery.',
          Reached:          'Location updated.',
          Started:          'Journey started — dealer notified.',
          Delayed:          'Delay reported. Dealer has been notified.',
        };
        this.toast.success(msgs[status] || 'Status updated.');
        this.updatingId = null;
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.error || 'Update failed');
        this.updatingId = null;
      }
    });
  }

  getRecentHistory(d: any): any[] {
    return (d.trackingHistory || []).slice(-3);
  }

  canSubmitUpdate(d: any): boolean {
    if (!d?._updateStatus) return false;
    if (this.updatingId === d.shipmentId) return false;

    if (d._updateStatus === 'VehicleBreakdown') {
      return !!(d._place || '').trim();
    }

    return true;
  }

  private resolvePlace(d: any): string | null {
    const typedPlace = (d._place || '').trim();
    if (typedPlace) return typedPlace;

    return d.shippingCity || d.shippingState || null;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      AgentAssigned:    'Agent Assigned',
      PickedUp:         'Picked Up',
      InTransit:        'In Transit',
      OutForDelivery:   'Out for Delivery',
      Delivered:        'Delivered',
      VehicleBreakdown: 'Vehicle Breakdown',
      Pending:          'Pending',
    };
    return map[status] || status;
  }

  getStatusPillClass(status: string): string {
    const map: Record<string, string> = {
      AgentAssigned:    'dc-status-pill--orange',
      PickedUp:         'dc-status-pill--blue',
      InTransit:        'dc-status-pill--blue',
      OutForDelivery:   'dc-status-pill--blue',
      Delivered:        'dc-status-pill--green',
      VehicleBreakdown: 'dc-status-pill--red',
    };
    return map[status] || 'dc-status-pill--gray';
  }
}
