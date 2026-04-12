import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

interface OrderStage {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-order-detail', standalone: false,
  template: `
    <div class="order-detail-page">

      <!-- Header -->
      <div class="od-header">
        <button class="od-back-btn" (click)="goBack()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          My Orders
        </button>
        <div class="od-title-row" *ngIf="order">
          <div>
            <h1 class="od-title">Order #{{ order.orderNumber }}</h1>
            <span class="od-placed-date">Placed {{ order.placedAt | date:'dd MMM yyyy, h:mm a' }}</span>
          </div>
          <span class="od-status-pill" [ngClass]="getStatusClass(order.status)">{{ formatStatus(order.status) }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="od-loading">
        <div *ngFor="let i of [1,2,3,4]" class="od-skel"></div>
      </div>

      <!-- Cancelled Banner -->
      <div *ngIf="!loading && order?.status === 'Cancelled'" class="od-cancelled-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div>
          <strong>Order Cancelled</strong>
          <span *ngIf="getCancelNote()"> — {{ getCancelNote() }}</span>
        </div>
      </div>

      <div *ngIf="!loading && order">

        <!-- ===== ORDER PROGRESS TIMELINE (8 stages) ===== -->
        <div class="od-card">
          <div class="od-card-title">Order Progress</div>
          <div class="order-progress">
            <div *ngFor="let stage of orderStages; let i = index" class="op-step"
                 [class.op-step--done]="isStageCompleted(stage.key)"
                 [class.op-step--active]="isStageActive(stage.key)"
                 [class.op-step--cancelled]="order.status === 'Cancelled' && !isStageCompleted(stage.key) && !isStageActive(stage.key)">

              <!-- connector line before each step (except first) -->
              <div class="op-connector" *ngIf="i > 0"
                   [class.op-connector--done]="isStageCompleted(stage.key)"></div>

              <div class="op-dot-wrap">
                <div class="op-dot">
                  <svg *ngIf="isStageCompleted(stage.key)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <div *ngIf="isStageActive(stage.key)" class="op-pulse"></div>
                  <span *ngIf="!isStageCompleted(stage.key) && !isStageActive(stage.key)" class="op-icon">{{ stage.icon }}</span>
                </div>
              </div>

              <div class="op-label">{{ stage.label }}</div>
              <div class="op-date" *ngIf="getStageDate(stage.key)">
                {{ getStageDate(stage.key) | date:'dd MMM' }}
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ACTIVITY LOG ===== -->
        <div class="od-card" *ngIf="activityEvents.length > 0">
          <div class="od-card-title">Activity Log</div>
          <div class="activity-log">
            <div *ngFor="let ev of activityEvents; let last = last" class="al-event">
              <div class="al-left">
                <div class="al-dot" [class.al-dot--last]="last"></div>
                <div class="al-line" *ngIf="!last"></div>
              </div>
              <div class="al-body">
                <span class="al-status">{{ formatStatus(ev.status) }}</span>
                <span class="al-time">{{ ev.timestamp | date:'dd MMM yyyy, h:mm a' }}</span>
                <span *ngIf="ev.note" class="al-note">{{ ev.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== ORDER ITEMS ===== -->
        <div class="od-card">
          <div class="od-card-title">Items Ordered</div>
          <div class="od-items">
            <div class="od-items-header">
              <span>Product</span><span>Qty</span><span>Unit Price</span><span>Total</span>
            </div>
            <div *ngFor="let item of order.lines || []" class="od-item-row">
              <div class="od-item-name">
                <div class="od-item-dot"></div>
                <div>
                  <div class="od-item-title">{{ item.productName || item.name }}</div>
                  <div class="od-item-sku" *ngIf="item.sku">SKU: {{ item.sku }}</div>
                </div>
              </div>
              <span class="od-item-qty">{{ item.quantity }}</span>
              <span class="od-item-price">₹{{ (item.unitPrice || item.price)?.toLocaleString('en-IN') }}</span>
              <span class="od-item-total">₹{{ (item.lineTotal || (item.unitPrice * item.quantity) || (item.price * item.quantity))?.toLocaleString('en-IN') }}</span>
            </div>
            <div class="od-items-total">
              <span>Order Total</span>
              <span class="od-items-total-val">₹{{ order.totalAmount?.toLocaleString('en-IN') }}</span>
            </div>
          </div>
        </div>

        <!-- ===== DELIVERY TRACKING ===== -->
        <div class="od-card" *ngIf="tracking || order.status === 'InTransit' || order.status === 'ReadyForDispatch' || order.status === 'Delivered'">
          <div class="od-card-title">Delivery Tracking</div>

          <!-- No tracking yet -->
          <div *ngIf="!tracking" class="od-no-tracking">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <p>Shipment not yet dispatched</p>
          </div>

          <!-- Tracking loaded -->
          <div *ngIf="tracking">

            <!-- Vehicle Breakdown Alert -->
            <div *ngIf="tracking.currentStatus === 'VehicleBreakdown'" class="od-breakdown-alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Vehicle breakdown reported. Delivery may be delayed. Our team is working to resolve this.</span>
            </div>

            <!-- SLA Risk Alert -->
            <div *ngIf="tracking.slaAtRisk && tracking.currentStatus !== 'Delivered'" class="od-sla-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Delivery might be slightly delayed. We apologize for the inconvenience.
            </div>

            <!-- Agent info chip -->
            <div *ngIf="tracking.agentName" class="od-agent-chip">
              <div class="od-agent-avatar">{{ (tracking.agentName || 'A').charAt(0).toUpperCase() }}</div>
              <div class="od-agent-info">
                <span class="od-agent-name">{{ tracking.agentName }}</span>
                <span class="od-agent-role">Delivery Agent</span>
              </div>
              <div class="od-agent-details" *ngIf="tracking.vehicleType || tracking.vehicleRegistrationNo">
                <span class="od-vehicle-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  {{ tracking.vehicleType }} {{ tracking.vehicleRegistrationNo }}
                </span>
              </div>
              <div class="od-agent-sla" *ngIf="tracking.slaDeadlineUtc">
                SLA: {{ tracking.slaDeadlineUtc | date:'dd MMM, h:mm a' }}
              </div>
            </div>

            <!-- Location history -->
            <div *ngIf="tracking.history?.length > 0" class="od-tracking-history">
              <div class="od-th-title">Location History</div>
              <div *ngFor="let ev of tracking.history; let last = last" class="od-th-event"
                   [class.od-th-event--breakdown]="ev.status === 'VehicleBreakdown'">
                <div class="od-th-left">
                  <div class="od-th-dot" [class.od-th-dot--green]="ev.status === 'Delivered'" [class.od-th-dot--orange]="ev.status === 'VehicleBreakdown'"></div>
                  <div class="od-th-line" *ngIf="!last"></div>
                </div>
                <div class="od-th-body">
                  <span class="od-th-status">{{ formatStatus(ev.status) }}</span>
                  <span *ngIf="ev.place" class="od-th-place">@ {{ ev.place }}</span>
                  <span class="od-th-time">{{ ev.recordedAt | date:'dd MMM, h:mm a' }}</span>
                  <span *ngIf="ev.notes" class="od-th-note">{{ ev.notes }}</span>
                </div>
              </div>
            </div>

            <!-- Rating -->
            <div *ngIf="tracking.customerRating" class="od-rating-row">
              <span class="od-rating-label">Your rating:</span>
              <div class="od-stars">
                <span *ngFor="let i of [1,2,3,4,5]" [class.filled]="i <= tracking.customerRating">★</span>
              </div>
              <span *ngIf="tracking.customerFeedback" class="od-feedback">"{{ tracking.customerFeedback }}"</span>
            </div>

            <!-- Rate delivery (delivered + not yet rated) -->
            <div *ngIf="tracking.currentStatus === 'Delivered' && !tracking.customerRating && !ratingSubmitted" class="od-rate-section">
              <div class="od-rate-title">How was your delivery experience?</div>
              <div class="od-rate-stars">
                <button *ngFor="let i of [1,2,3,4,5]" class="od-star-btn"
                  [class.od-star-btn--active]="ratingValue >= i"
                  (click)="ratingValue = i">★</button>
              </div>
              <textarea class="od-rate-feedback" [(ngModel)]="ratingFeedback" rows="2"
                placeholder="Optional feedback (e.g. fast delivery, careful handling)"></textarea>
              <button class="od-rate-submit" [disabled]="!ratingValue || ratingSubmitting" (click)="submitRating()">
                {{ ratingSubmitting ? 'Submitting…' : 'Submit Rating' }}
              </button>
            </div>
            <div *ngIf="ratingSubmitted" class="od-rate-thanks">
              Thank you for rating your delivery!
            </div>

          </div>
        </div>

        <!-- ===== ORDER SUMMARY ===== -->
        <div class="od-cards-row">
          <div class="od-card od-card--half">
            <div class="od-card-title">Payment Info</div>
            <div class="od-info-rows">
              <div class="od-info-row">
                <span class="od-info-label">Mode</span>
                <span>{{ order.paymentMode }}</span>
              </div>
              <div class="od-info-row">
                <span class="od-info-label">Status</span>
                <span class="od-pay-status" [class.od-pay-status--paid]="paymentStatus === 'Paid'">{{ paymentStatus }}</span>
              </div>
              <div class="od-info-row od-info-row--total">
                <span class="od-info-label">Total</span>
                <span class="od-total-amt">₹{{ order.totalAmount?.toLocaleString('en-IN') }}</span>
              </div>
            </div>
          </div>

          <div class="od-card od-card--half">
            <div class="od-card-title">Delivery Address</div>
            <div class="od-addr-block" *ngIf="order.shippingAddressLine || order.shippingCity">
              <div class="od-addr-name">Delivery Address</div>
              <div class="od-addr-line" *ngIf="order.shippingAddressLine">{{ order.shippingAddressLine }}</div>
              <div class="od-addr-line" *ngIf="order.shippingCity">{{ order.shippingCity }}</div>
              <div class="od-addr-line" *ngIf="order.shippingPinCode">PIN: {{ order.shippingPinCode }}</div>
            </div>
            <p *ngIf="!order.shippingAddressLine && !order.shippingCity" class="od-addr-na">No address on record</p>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .order-detail-page { max-width: 900px; animation: fadeIn 200ms ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    /* Header */
    .od-header { margin-bottom: 24px; }
    .od-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; font-weight: 600; color: var(--text-tertiary); cursor: pointer; font-family: var(--font-body); padding: 0; margin-bottom: 12px; transition: color var(--duration-fast); }
    .od-back-btn:hover { color: var(--hul-primary); }
    .od-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .od-title { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .od-placed-date { font-size: 13px; color: var(--text-tertiary); }
    .od-status-pill { padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; flex-shrink: 0; }
    .od-status-pill--placed { background: #dbeafe; color: #1d4ed8; }
    .od-status-pill--hold { background: #fef3c7; color: #92400e; }
    .od-status-pill--processing { background: #e0e7ff; color: #4338ca; }
    .od-status-pill--ready { background: #cffafe; color: #0e7490; }
    .od-status-pill--transit { background: #dbeafe; color: #1d4ed8; }
    .od-status-pill--delivered { background: #d1fae5; color: #065f46; }
    .od-status-pill--cancelled { background: #fee2e2; color: #991b1b; }

    /* Loading */
    .od-loading { display: flex; flex-direction: column; gap: 16px; }
    .od-skel { height: 120px; border-radius: var(--radius-lg); background: var(--bg-muted); animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

    /* Card */
    .od-card { background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-card); padding: 24px; margin-bottom: 20px; border: 1px solid var(--border-default); }
    .od-card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.04em; }
    .od-cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .od-card--half { margin-bottom: 0; }

    /* Cancelled Banner */
    .od-cancelled-banner { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: var(--radius-lg); color: #991b1b; font-size: 14px; margin-bottom: 20px; }

    /* ===== ORDER PROGRESS ===== */
    .order-progress {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      align-items: start;
      gap: 0;
      position: relative;
    }

    .op-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      position: relative;
      padding-top: 8px;
    }

    .op-connector {
      position: absolute;
      top: 22px;
      left: -50%;
      right: 50%;
      height: 2px;
      background: var(--border-default);
      z-index: 0;
    }
    .op-connector--done { background: #10b981; }

    .op-dot-wrap { position: relative; z-index: 1; }
    .op-dot {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--bg-muted); border: 2px solid var(--border-default);
      display: flex; align-items: center; justify-content: center;
      transition: all 300ms ease;
      position: relative;
    }
    .op-step--done .op-dot { background: #10b981; border-color: #10b981; color: white; }
    .op-step--active .op-dot { background: var(--hul-primary); border-color: var(--hul-primary); color: white; box-shadow: 0 0 0 4px rgba(3,105,161,.2); }
    .op-step--cancelled .op-dot { opacity: .3; }

    .op-pulse {
      width: 10px; height: 10px; border-radius: 50%; background: white;
      animation: pulse 1.5s ease infinite;
    }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .7; } }

    .op-icon { font-size: 14px; }
    .op-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-align: center; line-height: 1.3; }
    .op-step--done .op-label, .op-step--active .op-label { color: var(--text-primary); }
    .op-step--active .op-label { color: var(--hul-primary); font-weight: 700; }
    .op-date { font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono); }

    /* ===== ACTIVITY LOG ===== */
    .activity-log { display: flex; flex-direction: column; }
    .al-event { display: flex; gap: 12px; }
    .al-left { display: flex; flex-direction: column; align-items: center; width: 16px; flex-shrink: 0; }
    .al-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--hul-primary); flex-shrink: 0; border: 2px solid var(--bg-card); box-shadow: 0 0 0 2px var(--hul-primary); margin-top: 4px; }
    .al-dot--last { background: #10b981; box-shadow: 0 0 0 2px #10b981; }
    .al-line { flex: 1; width: 2px; background: var(--border-default); margin: 4px 0; min-height: 20px; }
    .al-body { padding-bottom: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .al-status { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .al-time { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .al-note { font-size: 12px; color: var(--text-secondary); font-style: italic; width: 100%; }

    /* ===== ORDER ITEMS ===== */
    .od-items { }
    .od-items-header { display: grid; grid-template-columns: 1fr 60px 100px 100px; gap: 12px; padding: 8px 12px; background: var(--bg-subtle); border-radius: var(--radius-md); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); margin-bottom: 8px; }
    .od-item-row { display: grid; grid-template-columns: 1fr 60px 100px 100px; gap: 12px; padding: 12px; border-bottom: 1px solid var(--border-default); align-items: center; }
    .od-item-row:last-of-type { border-bottom: none; }
    .od-item-name { display: flex; align-items: center; gap: 10px; }
    .od-item-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--hul-primary); flex-shrink: 0; }
    .od-item-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .od-item-sku { font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .od-item-qty { font-size: 14px; font-weight: 600; color: var(--text-primary); text-align: center; }
    .od-item-price { font-size: 13px; color: var(--text-secondary); text-align: right; }
    .od-item-total { font-size: 14px; font-weight: 600; color: var(--text-primary); text-align: right; font-family: var(--font-display); }
    .od-items-total { display: flex; justify-content: space-between; align-items: center; padding: 16px 12px 0; border-top: 2px solid var(--border-default); margin-top: 8px; font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .od-items-total-val { font-size: 20px; font-family: var(--font-display); color: var(--hul-primary); }

    /* ===== DELIVERY TRACKING ===== */
    .od-no-tracking { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 0; color: var(--text-tertiary); font-size: 14px; }
    .od-breakdown-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: var(--radius-md); color: #c2410c; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
    .od-sla-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fef3c7; border: 1px solid #fde68a; border-radius: var(--radius-md); color: #92400e; font-size: 13px; margin-bottom: 16px; }

    .od-agent-chip { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-default); margin-bottom: 20px; flex-wrap: wrap; }
    .od-agent-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--hul-primary); color: white; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .od-agent-info { flex: 1; min-width: 0; }
    .od-agent-name { font-size: 15px; font-weight: 700; color: var(--text-primary); display: block; }
    .od-agent-role { font-size: 12px; color: var(--text-tertiary); }
    .od-agent-details { display: flex; align-items: center; gap: 8px; }
    .od-vehicle-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 3px 10px; font-family: var(--font-mono); }
    .od-agent-sla { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

    .od-tracking-history { }
    .od-th-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); margin-bottom: 12px; }
    .od-th-event { display: flex; gap: 12px; }
    .od-th-left { display: flex; flex-direction: column; align-items: center; width: 16px; flex-shrink: 0; }
    .od-th-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--hul-primary); flex-shrink: 0; margin-top: 4px; }
    .od-th-dot--green { background: #10b981; }
    .od-th-dot--orange { background: #f97316; }
    .od-th-line { flex: 1; width: 2px; background: var(--border-default); margin: 4px 0; min-height: 20px; }
    .od-th-body { padding-bottom: 16px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
    .od-th-status { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .od-th-event--breakdown .od-th-status { color: #ea580c; }
    .od-th-place { font-size: 13px; color: var(--hul-primary); }
    .od-th-time { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .od-th-note { font-size: 12px; color: var(--text-secondary); font-style: italic; width: 100%; }

    /* Rating */
    .od-rating-row { display: flex; align-items: center; gap: 10px; padding: 14px; background: #fef9c3; border-radius: var(--radius-md); margin-top: 16px; flex-wrap: wrap; }
    .od-rating-label { font-size: 13px; font-weight: 600; color: #92400e; }
    .od-stars span { font-size: 20px; color: #d1d5db; }
    .od-stars span.filled { color: #f59e0b; }
    .od-feedback { font-size: 12px; color: #78350f; font-style: italic; }

    /* Rate delivery */
    .od-rate-section { padding: 16px; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-default); margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .od-rate-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .od-rate-stars { display: flex; gap: 4px; }
    .od-star-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: #d1d5db; padding: 0; line-height: 1; transition: color var(--duration-fast), transform var(--duration-fast); }
    .od-star-btn:hover, .od-star-btn--active { color: #f59e0b; transform: scale(1.1); }
    .od-rate-feedback { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body); resize: vertical; box-sizing: border-box; }
    .od-rate-submit { padding: 10px 20px; background: var(--hul-primary); color: white; border: none; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body); align-self: flex-start; transition: background var(--duration-fast); }
    .od-rate-submit:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .od-rate-submit:disabled { opacity: .5; cursor: not-allowed; }
    .od-rate-thanks { padding: 12px 16px; background: #d1fae5; color: #065f46; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; margin-top: 16px; }

    /* Info rows */
    .od-info-rows { display: flex; flex-direction: column; gap: 0; }
    .od-info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-default); font-size: 14px; }
    .od-info-row:last-child { border-bottom: none; }
    .od-info-row--total { padding-top: 14px; }
    .od-info-label { color: var(--text-tertiary); font-size: 13px; }
    .od-pay-status { font-weight: 600; }
    .od-pay-status--paid { color: #059669; }
    .od-total-amt { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text-primary); }

    /* Address */
    .od-addr-block { display: flex; flex-direction: column; gap: 4px; }
    .od-addr-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .od-addr-line { font-size: 13px; color: var(--text-secondary); }
    .od-addr-phone { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--hul-primary); font-family: var(--font-mono); margin-top: 4px; }
    .od-addr-na { font-size: 13px; color: var(--text-tertiary); margin: 0; }

    @media (max-width: 768px) {
      .order-progress { grid-template-columns: repeat(4, 1fr); }
      .od-cards-row { grid-template-columns: 1fr; }
      .od-items-header, .od-item-row { grid-template-columns: 1fr 50px 80px; }
      .od-items-header span:nth-child(4), .od-item-row .od-item-total { display: none; }
    }
    @media (max-width: 480px) {
      .order-progress { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  loading = true;
  order: any = null;
  paymentStatus = 'Pending';
  private invoiceLookupDisabled = false;
  tracking: any = null;
  activityEvents: Array<{ status: string; timestamp: string; note?: string | null }> = [];
  ratingValue = 0;
  ratingFeedback = '';
  ratingSubmitting = false;
  ratingSubmitted = false;
  private orderId: string | null = null;
  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  readonly orderStages: OrderStage[] = [
    { key: 'Placed', label: 'Order Placed', icon: '📋' },
    { key: 'OnHold', label: 'Waiting for Admin Approval', icon: '⏳' },
    { key: 'Processing', label: 'Processing & Packing', icon: '📦' },
    { key: 'ReadyForDispatch', label: 'Ready for Dispatch', icon: '✅' },
    { key: 'AgentAssigned', label: 'Agent Assigned', icon: '🚚' },
    { key: 'InTransit', label: 'In Transit', icon: '🛣️' },
    { key: 'OutForDelivery', label: 'Out for Delivery', icon: '🏠' },
    { key: 'Delivered', label: 'Delivered', icon: '🎉' },
  ];

  // Maps order status → which stage is active (and which stages before it are complete)
  private readonly stageOrder: string[] = [
    'Placed', 'OnHold', 'Processing', 'ReadyForDispatch',
    'AgentAssigned', 'InTransit', 'OutForDelivery', 'Delivered'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: ZoneHttpService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId');
    if (this.orderId) {
      this.loadOrder(this.orderId);
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }

    this.refreshHandle = setInterval(() => {
      if (!this.orderId) return;
      this.loadOrder(this.orderId, true);
    }, 15000);
  }

  loadOrder(orderId: string, silent = false): void {
    if (!silent) {
      this.loading = true;
    }

    this.http.get<any>(API_ENDPOINTS.orders.orderById(orderId)).subscribe({
      next: o => {
        this.order = o;
        this.paymentStatus = o?.paymentStatus || 'Pending';
        if (!this.invoiceLookupDisabled) {
          this.loadPaymentStatus(orderId);
        }
        if (!silent) {
          this.loading = false;
        }
        this.loadTracking(orderId);

        // Stop polling for terminal states — they will never change again
        const terminalStatuses = ['Delivered', 'Cancelled'];
        if (terminalStatuses.includes(o?.status) && this.refreshHandle) {
          clearInterval(this.refreshHandle);
          this.refreshHandle = null;
        }
      },
      error: () => {
        if (!silent) {
          this.loading = false;
        }
      }
    });
  }


  private loadPaymentStatus(orderId: string): void {
    const silentOpts = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' }) };

    this.http.get<any>(API_ENDPOINTS.payment.invoiceByOrderId(orderId), silentOpts).subscribe({
      next: invoice => {
        const resolvedStatus = invoice?.status || invoice?.paymentStatus || (invoice?.paidAt ? 'Paid' : 'Pending');
        this.paymentStatus = resolvedStatus || this.paymentStatus || 'Pending';
      },
      error: (error: HttpErrorResponse) => {
        // Invoice can legitimately be unavailable for some order stages; avoid retry noise.
        if (error.status === 404) {
          this.invoiceLookupDisabled = true;
        }
        this.paymentStatus = this.order?.paymentStatus || this.paymentStatus || 'Pending';
      }
    });
  }

  loadTracking(orderId: string): void {
    this.http.get<any>(API_ENDPOINTS.logistics.tracking(orderId)).subscribe({
      next: t => {
        this.tracking = this.normalizeTracking(t);
        this.rebuildActivityEvents();
      },
      error: () => {
        this.tracking = null;
        this.rebuildActivityEvents();
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
      history,
      trackingHistory: history
    };
  }

  private rebuildActivityEvents(): void {
    const orderEvents = (this.order?.statusHistory || []).map((ev: any) => ({
      status: ev.toStatus || ev.status,
      timestamp: ev.changedAt || ev.timestamp,
      note: ev.notes || ev.note || null
    }));

    const trackingEvents = (this.tracking?.history || []).map((ev: any) => ({
      status: ev.status,
      timestamp: ev.recordedAt,
      note: ev.notes || null
    }));

    const combined = [...orderEvents, ...trackingEvents]
      .filter(ev => !!ev.status && !!ev.timestamp)
      .sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    this.activityEvents = combined.filter((ev, idx, arr) =>
      arr.findIndex(x =>
        x.status === ev.status &&
        x.timestamp === ev.timestamp &&
        (x.note || '') === (ev.note || '')
      ) === idx
    );
  }

  goBack(): void {
    this.router.navigate(['/dealer/orders']);
  }

  // Determine the current stage index from the order+tracking status
  private getCurrentStageIndex(): number {
    if (!this.order) return -1;

    const orderStatus = this.order.status;

    // Map agent-assigned / in-transit / out-for-delivery from tracking
    const trackingStatus = this.tracking?.currentStatus || this.tracking?.status;
    if (trackingStatus) {
      if (trackingStatus === 'Delivered') return this.stageOrder.indexOf('Delivered');
      if (trackingStatus === 'OutForDelivery') return this.stageOrder.indexOf('OutForDelivery');
      if (trackingStatus === 'AgentAssigned') return this.stageOrder.indexOf('AgentAssigned');
      if (trackingStatus === 'PickedUp' || trackingStatus === 'InTransit' || trackingStatus === 'VehicleBreakdown') {
        return this.stageOrder.indexOf('InTransit');
      }
    }

    // Map order status
    switch (orderStatus) {
      case 'Delivered': return this.stageOrder.indexOf('Delivered');
      case 'InTransit': return this.stageOrder.indexOf('InTransit');
      case 'ReadyForDispatch': {
        // Check if agent is assigned
        if (this.tracking && this.tracking.agentName) return this.stageOrder.indexOf('AgentAssigned');
        return this.stageOrder.indexOf('ReadyForDispatch');
      }
      case 'Processing': return this.stageOrder.indexOf('Processing');
      case 'OnHold': return this.stageOrder.indexOf('OnHold');
      case 'Placed': return this.stageOrder.indexOf('Placed');
      case 'Cancelled': return -1;
      default: return 0;
    }
  }

  isStageCompleted(key: string): boolean {
    if (this.order?.status === 'Cancelled') return false;
    const currentIdx = this.getCurrentStageIndex();
    const keyIdx = this.stageOrder.indexOf(key);
    return keyIdx < currentIdx;
  }

  isStageActive(key: string): boolean {
    if (this.order?.status === 'Cancelled') return false;
    const currentIdx = this.getCurrentStageIndex();
    const keyIdx = this.stageOrder.indexOf(key);
    return keyIdx === currentIdx;
  }

  getStageDate(key: string): string | null {
    if (!this.order?.statusHistory && !this.tracking?.history) return null;
    const map: Record<string, string[]> = {
      'Placed': ['Placed'],
      'OnHold': ['OnHold'],
      'Processing': ['Processing'],
      'ReadyForDispatch': ['ReadyForDispatch'],
      'InTransit': ['InTransit'],
      'OutForDelivery': ['OutForDelivery'],
      'Delivered': ['Delivered'],
    };
    const statuses = map[key] || [key];
    for (const ev of (this.order?.statusHistory || [])) {
      const evStatus = ev.toStatus || ev.status;
      if (statuses.includes(evStatus)) return ev.changedAt || ev.timestamp;
    }

    for (const ev of (this.tracking?.history || [])) {
      if (statuses.includes(ev.status)) return ev.recordedAt;
    }

    if (key === 'AgentAssigned') {
      const assigned = (this.tracking?.history || []).find((ev: any) => ev.status === 'AgentAssigned');
      if (assigned) return assigned.recordedAt;
    }

    return null;
  }

  getCancelNote(): string | null {
    if (!this.order?.statusHistory) return null;
    const ev = this.order.statusHistory.find((e: any) => (e.toStatus || e.status) === 'Cancelled');
    return ev?.notes || ev?.note || null;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Placed: 'od-status-pill--placed',
      OnHold: 'od-status-pill--hold',
      Processing: 'od-status-pill--processing',
      ReadyForDispatch: 'od-status-pill--ready',
      InTransit: 'od-status-pill--transit',
      Delivered: 'od-status-pill--delivered',
      Cancelled: 'od-status-pill--cancelled',
    };
    return map[status] || 'od-status-pill--placed';
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      Placed: 'Order Placed',
      OnHold: 'Purchase Limit Exceeded - Waiting for Admin Approval',
      Processing: 'Processing',
      ReadyForDispatch: 'Ready for Dispatch',
      InTransit: 'In Transit',
      OutForDelivery: 'Out for Delivery',
      Delivered: 'Delivered',
      Cancelled: 'Cancelled',
      AgentAssigned: 'Agent Assigned',
      PickedUp: 'Picked Up',
      VehicleBreakdown: 'Vehicle Breakdown',
    };
    return map[status] || status;
  }

  submitRating(): void {
    if (!this.ratingValue || !this.tracking?.shipmentId) return;
    this.ratingSubmitting = true;
    this.http.post(API_ENDPOINTS.logistics.rateShipment(this.tracking.shipmentId), {
      rating: this.ratingValue,
      feedback: this.ratingFeedback.trim() || null
    }).subscribe({
      next: () => { this.ratingSubmitting = false; this.ratingSubmitted = true; this.toast.success('Rating submitted!'); },
      error: err => { this.ratingSubmitting = false; this.toast.error(err.error?.error || 'Failed to submit rating'); }
    });
  }
}
