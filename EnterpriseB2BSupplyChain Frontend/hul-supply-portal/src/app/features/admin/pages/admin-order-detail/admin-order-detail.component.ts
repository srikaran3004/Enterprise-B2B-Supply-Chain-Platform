import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { TimelineEvent } from '../../../../shared/ui/timeline/hul-timeline.component';

@Component({
  selector: 'app-admin-order-detail', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header
        [title]="'Order ' + (order?.orderNumber || '')"
        subtitle="Order details and status tracking"
        [breadcrumbs]="[{label:'Orders',route:'/admin/orders'},{label:order?.orderNumber||''}]">
      </hul-page-header>

      <!-- Loading skeleton -->
      <div *ngIf="loading" class="skeleton-wrap">
        <div *ngFor="let i of [1,2,3]" class="skeleton" style="height:140px;margin-bottom:16px;border-radius:var(--radius-lg)"></div>
      </div>

      <div *ngIf="!loading && order" class="order-detail-grid">

        <!-- ── Dealer Information ── -->
        <div class="detail-card">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Dealer Information
          </div>
          <div class="info-row"><span class="info-label">Name</span><span class="info-value">{{ order.dealerName || 'N/A' }}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{ order.dealerEmail || 'N/A' }}</span></div>
          <div class="info-row"><span class="info-label">Dealer ID</span><span class="info-value mono">{{ order.dealerId }}</span></div>
        </div>

        <!-- ── Order Summary ── -->
        <div class="detail-card">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Order Summary
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <hul-status-badge [status]="order.status"></hul-status-badge>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Mode</span>
            <span class="info-value"><span class="badge-pill">{{ order.paymentMode }}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Status</span>
            <span class="info-value">
              <span class="badge-pill" [ngClass]="getPaymentStatusClass(order.paymentStatus)">
                {{ order.paymentStatus || 'Pending' }}
              </span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Amount</span>
            <span class="info-value amount">&#8377;{{ order.totalAmount?.toLocaleString('en-IN') }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Order Placed</span>
            <span class="info-value">{{ formatIST(order.placedAt) }}</span>
          </div>
          <div class="info-row" *ngIf="order.updatedAt">
            <span class="info-label">Last Updated</span>
            <span class="info-value">{{ formatIST(order.updatedAt) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total Items</span>
            <span class="info-value">{{ totalQty }} units</span>
          </div>
          <div class="info-row" *ngIf="order.notes">
            <span class="info-label">Notes</span>
            <span class="info-value notes-val">{{ order.notes }}</span>
          </div>
        </div>

        <!-- ── Delivery Agent Card (shown only when an agent is assigned) ── -->
        <div class="detail-card agent-card-panel" *ngIf="tracking && tracking.agentName">
          <div class="card-header card-header--agent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Delivery Agent
            <span class="agent-status-pill" [ngClass]="getShipmentStatusClass(tracking.currentStatus)">
              {{ getShipmentStatusLabel(tracking.currentStatus) }}
            </span>
          </div>

          <!-- Agent Avatar + Name row -->
          <div class="agent-hero">
            <div class="agent-avatar">{{ getInitials(tracking.agentName) }}</div>
            <div class="agent-hero__info">
              <div class="agent-hero__name">{{ tracking.agentName }}</div>
              <div class="agent-hero__phone" *ngIf="tracking.agentPhone">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44 2 2 0 0 1 3.6 2.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <a [href]="'tel:' + tracking.agentPhone">{{ tracking.agentPhone }}</a>
              </div>
            </div>
          </div>

          <div class="info-row" *ngIf="tracking.vehicleRegistrationNo">
            <span class="info-label">Vehicle</span>
            <span class="info-value mono">{{ tracking.vehicleRegistrationNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">SLA Deadline</span>
            <span class="info-value" [class.sla-risk]="tracking.slaAtRisk">
              {{ formatIST(tracking.slaDeadlineUtc) }}
              <span *ngIf="tracking.slaAtRisk" class="sla-risk-tag">&#9888; At Risk</span>
            </span>
          </div>

          <!-- Tracking history in the card -->
          <div class="tracking-history" *ngIf="tracking.history && tracking.history.length > 0">
            <div class="tracking-history__title">Tracking History</div>
            <div *ngFor="let ev of tracking.history" class="tracking-ev"
                 [class.tracking-ev--breakdown]="ev.status === 'VehicleBreakdown'">
              <div class="tracking-ev__dot"></div>
              <div class="tracking-ev__body">
                <span class="tracking-ev__status">{{ getShipmentStatusLabel(ev.status) }}</span>
                <span *ngIf="ev.place" class="tracking-ev__place">&nbsp;@ {{ ev.place }}</span>
                <span *ngIf="ev.notes && ev.notes !== ev.status" class="tracking-ev__notes">{{ ev.notes }}</span>
              </div>
              <span class="tracking-ev__time">{{ formatIST(ev.recordedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- ── Delivery Address ── -->
        <div class="detail-card detail-card--full">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Delivery Address
          </div>
          <div class="address-block" *ngIf="hasAddress; else noAddress">
            <div class="address-layout">
              <div class="address-main-col">
                <div class="address-name" *ngIf="order.dealerName">{{ order.dealerName }}</div>
                <div class="address-tag-row" *ngIf="order.shippingAddressLabel">
                  <span class="address-tag">{{ order.shippingAddressLabel }}</span>
                </div>
                <div class="address-full">
                  <span *ngIf="order.shippingAddressLine">{{ order.shippingAddressLine }}</span>
                  <span *ngIf="order.shippingCity">, {{ order.shippingCity }}</span>
                  <span *ngIf="order.shippingState">, {{ order.shippingState }}</span>
                  <span *ngIf="order.shippingPinCode"> &mdash; {{ order.shippingPinCode }}</span>
                </div>
              </div>
              <div class="address-chips-col">
                <div class="address-chip" *ngIf="order.shippingCity">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  <span class="chip-label">City</span>
                  <span class="chip-value">{{ order.shippingCity }}</span>
                </div>
                <div class="address-chip" *ngIf="order.shippingState">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span class="chip-label">State</span>
                  <span class="chip-value">{{ order.shippingState }}</span>
                </div>
                <div class="address-chip address-chip--pin" *ngIf="order.shippingPinCode">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  <span class="chip-label">Pincode</span>
                  <span class="chip-value mono">{{ order.shippingPinCode }}</span>
                </div>
                <div class="address-chip" *ngIf="order.dealerEmail">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span class="chip-label">Email</span>
                  <span class="chip-value">{{ order.dealerEmail }}</span>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noAddress>
            <div class="no-address">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <p>No delivery address recorded for this order</p>
            </div>
          </ng-template>
        </div>

        <!-- ── Order Items ── -->
        <div class="detail-card detail-card--full">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Order Items
            <span class="card-header__badge">{{ (order.lines || []).length }} item{{ (order.lines || []).length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="table-wrap">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of order.lines || []">
                  <td class="product-name">{{ item.productName }}</td>
                  <td><span class="mono">{{ item.sku }}</span></td>
                  <td class="text-right qty-cell">{{ item.quantity }}</td>
                  <td class="text-right">&#8377;{{ item.unitPrice?.toLocaleString('en-IN') }}</td>
                  <td class="text-right amount-cell">&#8377;{{ item.lineTotal?.toLocaleString('en-IN') }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="tfoot-label">Total</td>
                  <td class="text-right tfoot-qty">{{ totalQty }} units</td>
                  <td></td>
                  <td class="text-right tfoot-amount">&#8377;{{ order.totalAmount?.toLocaleString('en-IN') }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ── Status Timeline ── -->
        <div class="detail-card detail-card--full">
          <div class="card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Order Timeline
          </div>
          <div style="padding: 20px;">
            <hul-timeline [events]="timelineEvents"></hul-timeline>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .order-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .order-detail-grid { grid-template-columns: 1fr; } }

    .detail-card {
      background: var(--bg-card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card); padding: 0;
      border: 1px solid var(--border-default); overflow: hidden;
    }
    .detail-card--full { grid-column: 1 / -1; }

    .card-header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px; border-bottom: 1px solid var(--border-default);
      font-size: 14px; font-weight: 700; color: var(--text-primary);
      font-family: var(--font-display); background: var(--bg-subtle);
    }
    .card-header svg { color: var(--hul-primary); flex-shrink: 0; }
    .card-header__badge {
      margin-left: auto; padding: 2px 10px; border-radius: 9999px;
      font-size: 12px; font-weight: 600; background: var(--hul-primary-light); color: var(--hul-primary);
    }
    .card-header--agent {
      background: linear-gradient(135deg, rgba(3,105,161,.07), rgba(16,185,129,.04));
    }

    /* Agent status pill in header */
    .agent-status-pill {
      margin-left: auto; padding: 3px 12px; border-radius: 9999px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
    }
    .agent-pill--blue    { background: #dbeafe; color: #1d4ed8; }
    .agent-pill--orange  { background: #ffedd5; color: #c2410c; }
    .agent-pill--green   { background: #d1fae5; color: #065f46; }
    .agent-pill--gray    { background: var(--bg-muted); color: var(--text-secondary); }
    .agent-pill--red     { background: #fee2e2; color: #991b1b; }

    /* Agent hero row */
    .agent-hero {
      display: flex; align-items: center; gap: 16px;
      padding: 18px 20px; border-bottom: 1px solid var(--border-default);
    }
    .agent-avatar {
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, var(--hul-primary), #0ea5e9);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; font-family: var(--font-display); flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(3,105,161,.25);
    }
    .agent-hero__info { flex: 1; }
    .agent-hero__name { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .agent-hero__phone { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
    .agent-hero__phone svg { color: var(--hul-primary); }
    .agent-hero__phone a { font-family: var(--font-mono); font-size: 13px; color: var(--hul-primary); text-decoration: none; font-weight: 600; }
    .agent-hero__phone a:hover { text-decoration: underline; }
    .sla-risk { color: #dc2626 !important; }
    .sla-risk-tag { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 9999px; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; }

    /* Tracking History */
    .tracking-history { padding: 14px 20px 18px; border-top: 1px solid var(--border-default); }
    .tracking-history__title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); margin-bottom: 10px; }
    .tracking-ev {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 7px 0; border-bottom: 1px dashed var(--border-default); font-size: 13px;
    }
    .tracking-ev:last-child { border-bottom: none; padding-bottom: 0; }
    .tracking-ev__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--hul-primary); flex-shrink: 0; margin-top: 4px; }
    .tracking-ev--breakdown .tracking-ev__dot { background: #ef4444; }
    .tracking-ev__body { flex: 1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px; }
    .tracking-ev__status { font-weight: 700; color: var(--text-primary); }
    .tracking-ev__place { color: var(--hul-primary); font-size: 12px; }
    .tracking-ev__notes { color: var(--text-tertiary); font-size: 12px; font-style: italic; width: 100%; margin-top: 2px; }
    .tracking-ev__time { flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }

    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 11px 20px; border-bottom: 1px solid var(--border-default); font-size: 14px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: var(--text-tertiary); font-size: 13px; flex-shrink: 0; }
    .info-value { color: var(--text-primary); text-align: right; font-weight: 500; max-width: 60%; }
    .notes-val { font-style: italic; color: var(--text-secondary); text-align: right; }
    .mono { font-family: var(--font-mono); font-size: 12px; }
    .amount { font-family: var(--font-display); font-weight: 700; color: var(--hul-primary); font-size: 15px; }
    .badge-pill {
      padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;
      background: var(--bg-muted); color: var(--text-secondary);
    }
    .badge-pill--paid { background: #d1fae5; color: #065f46; }
    .badge-pill--pending { background: #ffedd5; color: #c2410c; }
    .badge-pill--failed { background: #fee2e2; color: #991b1b; }

    /* Address */
    .address-block { padding: 20px; }
    .address-layout { display: grid; grid-template-columns: 1fr auto; gap: 24px; }
    @media (max-width: 640px) { .address-layout { grid-template-columns: 1fr; } }
    .address-name { font-size: 17px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); margin-bottom: 8px; }
    .address-tag-row { margin-bottom: 6px; }
    .address-tag {
      display: inline-block; padding: 2px 10px; border-radius: 9999px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
      background: rgba(3,105,161,.08); color: var(--hul-primary);
    }
    .address-full { font-size: 15px; color: var(--text-primary); line-height: 1.7; }
    .address-chips-col { display: flex; flex-direction: column; gap: 8px; }
    .address-chip {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 12px; border-radius: var(--radius-lg);
      background: var(--bg-subtle); border: 1px solid var(--border-default);
      min-width: 200px;
    }
    .address-chip svg { color: var(--hul-primary); flex-shrink: 0; }
    .chip-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: .04em; width: 52px; flex-shrink: 0; }
    .chip-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .address-chip--pin .chip-value { font-family: var(--font-mono); }
    .no-address { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; text-align: center; color: var(--text-tertiary); }
    .no-address p { margin: 0; font-size: 14px; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary);
      padding: 10px 20px; text-align: left; border-bottom: 1px solid var(--border-default);
      white-space: nowrap; background: var(--bg-subtle);
    }
    .items-table td { font-size: 14px; color: var(--text-primary); padding: 12px 20px; border-bottom: 1px solid var(--border-default); }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .items-table tfoot td { padding: 12px 20px; background: var(--bg-subtle); border-top: 2px solid var(--border-default); }
    .product-name { font-weight: 500; }
    .qty-cell { font-family: var(--font-mono); font-weight: 600; }
    .amount-cell { font-family: var(--font-display); font-weight: 700; color: var(--hul-primary); }
    .text-right { text-align: right; }
    .tfoot-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .04em; }
    .tfoot-qty { font-family: var(--font-mono); font-weight: 700; color: var(--text-secondary); text-align: right; }
    .tfoot-amount { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--hul-primary); }

    .skeleton-wrap { display: flex; flex-direction: column; gap: 16px; }
    .skeleton {
      background: linear-gradient(90deg, var(--bg-muted) 0%, var(--bg-subtle) 50%, var(--bg-muted) 100%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `]
})
export class AdminOrderDetailComponent implements OnInit {
  loading = true;
  order: any = null;
  tracking: any = null;
  timelineEvents: TimelineEvent[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: ZoneHttpService
  ) { }

  get hasAddress(): boolean {
    return !!(this.order?.shippingAddressLine || this.order?.shippingCity || this.order?.shippingState);
  }

  get totalQty(): number {
    return (this.order?.lines || []).reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);
  }

  /** Format a UTC date string to IST (UTC+5:30) with dd MMM yyyy, h:mm a */
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase();
  }

  getShipmentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Pending: 'Pending',
      AgentAssigned: 'Agent Assigned',
      PickedUp: 'Picked Up',
      InTransit: 'In Transit',
      OutForDelivery: 'Out for Delivery',
      Delivered: 'Delivered',
      VehicleBreakdown: 'Vehicle Breakdown',
      Failed: 'Failed',
    };
    return map[status] || status;
  }

  getPaymentStatusClass(status: string): string {
    if (status === 'Paid') return 'badge-pill--paid';
    if (status === 'Failed') return 'badge-pill--failed';
    return 'badge-pill--pending';
  }

  getShipmentStatusClass(status: string): string {
    const map: Record<string, string> = {
      AgentAssigned: 'agent-pill--orange',
      PickedUp: 'agent-pill--blue',
      InTransit: 'agent-pill--blue',
      OutForDelivery: 'agent-pill--blue',
      Delivered: 'agent-pill--green',
      VehicleBreakdown: 'agent-pill--red',
      Failed: 'agent-pill--red',
    };
    return map[status] || 'agent-pill--gray';
  }

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) this.loadOrder(orderId);
  }

  loadOrder(orderId: string): void {
    this.loading = true;
    this.http.get<any>(API_ENDPOINTS.orders.orderById(orderId)).subscribe({
      next: o => {
        this.order = o;
        this.loading = false;
        this.timelineEvents = (o.statusHistory || []).map((s: any, i: number, arr: any[]) => ({
          label: s.toStatus || s.status,
          sublabel: this.formatIST(s.changedAt || s.timestamp),
          timestamp: s.changedAt || s.timestamp,
          notes: s.notes,
          variant: ((s.toStatus || s.status) === 'Delivered' || i < arr.length - 1)
            ? 'completed' as const
            : 'active' as const
        }));
        if (this.timelineEvents.length === 0) {
          this.timelineEvents = [{ label: o.status, timestamp: o.placedAt, variant: 'active' }];
        }
        // Load tracking/agent info — non-blocking, 204 simply hides the agent card
        this.loadTracking(orderId);
      },
      error: () => this.loading = false
    });
  }

  loadTracking(orderId: string): void {
    this.http.get<any>(API_ENDPOINTS.logistics.tracking(orderId)).subscribe({
      next: t => { this.tracking = t; },
      error: () => { this.tracking = null; }
    });
  }
}
