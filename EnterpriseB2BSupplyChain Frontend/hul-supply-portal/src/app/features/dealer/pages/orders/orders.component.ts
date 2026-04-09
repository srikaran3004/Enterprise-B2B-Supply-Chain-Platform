import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import * as OrdersActions from '../../../../store/orders/orders.actions';
import { selectFilteredOrders, selectOrdersLoading, selectStatusFilter } from '../../../../store/orders/orders.reducer';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-orders',
  standalone: false,
  template: `
    <div class="orders-page">
      <hul-page-header title="My Orders" subtitle="Track and manage your wholesale orders"
        [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Orders'}]">
      </hul-page-header>

      <!-- Status filters -->
      <div class="orders-page__filters">
        <button *ngFor="let status of statusFilters"
                class="status-pill"
                [class.status-pill--active]="currentFilter === status.value"
                (click)="filterByStatus(status.value)">
          {{ status.label }}
        </button>
      </div>

      <!-- Table -->
      <hul-skeleton *ngIf="loading$ | async" type="table" [count]="8"></hul-skeleton>

      <div *ngIf="!(loading$ | async)" class="orders-page__table">
        <div class="orders-table">
          <table *ngIf="orders.length > 0">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of orders; let i = index" [style.animation-delay]="(i * 40) + 'ms'" class="order-row">
                <td>
                  <a [routerLink]="['/dealer/orders', order.orderId]" class="order-link">{{ order.orderNumber }}</a>
                </td>
                <td>{{ order.totalItems }} products</td>
                <td class="mono">{{ order.totalAmount | inrCurrency }}</td>
                <td>
                  <hul-badge [variant]="order.paymentMode === 'COD' ? 'warning' : 'primary'" size="sm">
                    {{ order.paymentMode }}
                  </hul-badge>
                </td>
                <td><hul-status-badge [status]="order.status"></hul-status-badge></td>
                <td>
                  <span class="date-primary">{{ order.placedAt | date:'dd MMM yyyy' }}</span>
                  <span class="date-secondary">{{ order.placedAt | relativeTime }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    <hul-button variant="ghost" size="sm" (click)="viewOrder(order.orderId)">View</hul-button>
                    <hul-button *ngIf="isCancellable(order.status)" variant="ghost" size="sm" (click)="cancelOrder(order.orderId)">Cancel</hul-button>
                    <button *ngIf="canRateOrder(order)"
                            class="rate-btn" (click)="openRateModal(order)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      Rate Delivery
                    </button>
                    <span *ngIf="isOrderRated(order)" class="rated-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Rated
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hul-empty-state *ngIf="orders.length === 0"
          icon="shopping-bag" title="No orders yet"
          description="Start by browsing our catalog to place your first order"
          actionLabel="Browse Catalog" (action)="goToCatalog()">
        </hul-empty-state>
      </div>

      <!-- Rate Delivery Modal -->
      <app-rate-delivery
        [isOpen]="showRateModal"
        [shipmentId]="rateShipmentId"
        [orderNumber]="rateOrderNumber"
        (closed)="closeRateModal()"
        (rated)="onRated($event)">
      </app-rate-delivery>

      <hul-modal [isOpen]="showCancelModal" title="Cancel Order" size="md" (closed)="closeCancelModal()">
        <div class="cancel-modal">
          <p class="cancel-modal__text">
            Cancel order <strong>{{ cancelOrderNumber }}</strong> and share the reason below.
          </p>
          <label class="cancel-modal__label" for="dealer-cancel-reason">Cancellation reason <span>*</span></label>
          <textarea
            id="dealer-cancel-reason"
            [(ngModel)]="cancelReason"
            class="cancel-modal__textarea"
            rows="4"
            maxlength="500"
            placeholder="Tell us why you're cancelling this order"></textarea>
          <p class="cancel-modal__hint">We’ll save this reason with the order and include it in the cancellation record.</p>
        </div>
        <div modal-footer class="cancel-modal__actions">
          <button class="cancel-modal__btn cancel-modal__btn--ghost" (click)="closeCancelModal()">Keep Order</button>
          <button class="cancel-modal__btn cancel-modal__btn--danger" [disabled]="!canSubmitCancellation()" (click)="submitCancellation()">Cancel Order</button>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .orders-page { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .orders-page__filters {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .status-pill {
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
      font-family: var(--font-body);
      border: 1px solid var(--border-default);
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .status-pill:hover { border-color: var(--hul-primary); color: var(--hul-primary); }

    .status-pill--active {
      background: var(--hul-primary) !important;
      color: white !important;
      border-color: var(--hul-primary) !important;
    }

    .orders-table {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      overflow-x: auto;
    }

    .orders-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table th {
      background: var(--bg-subtle);
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      border-bottom: 1px solid var(--border-default);
      white-space: nowrap;
    }

    .orders-table td {
      padding: 14px 16px;
      font-size: 14px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-default);
      vertical-align: middle;
    }

    .order-row {
      transition: background var(--duration-fast) var(--ease-out);
      animation: fadeIn 300ms var(--ease-out) both;
    }

    .order-row:hover { background: var(--bg-subtle); }
    .order-row:last-child td { border-bottom: none; }

    .order-link {
      color: var(--hul-primary);
      font-weight: 600;
      text-decoration: none;
    }

    .order-link:hover { text-decoration: underline; }

    .mono { font-family: var(--font-mono); font-weight: 500; }

    .date-primary { display: block; }
    .date-secondary { display: block; font-size: 12px; color: var(--text-tertiary); }

    .action-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .rate-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      border-radius: 9999px;
      background: linear-gradient(135deg, #f59e0b, #f97316);
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
      transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
      white-space: nowrap;
    }
    .rate-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(245, 158, 11, 0.32);
    }

    .rated-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 9999px;
      background: #ecfdf3;
      color: #047857;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      white-space: nowrap;
    }

    .cancel-modal { display: flex; flex-direction: column; gap: 12px; }
    .cancel-modal__text { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
    .cancel-modal__label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .cancel-modal__label span { color: var(--hul-danger); }
    .cancel-modal__textarea {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      padding: 12px 14px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 14px;
      box-sizing: border-box;
    }
    .cancel-modal__textarea:focus {
      outline: none;
      border-color: var(--hul-danger);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
    .cancel-modal__hint { margin: 0; font-size: 12px; color: var(--text-tertiary); }
    .cancel-modal__actions { display: flex; justify-content: flex-end; gap: 10px; }
    .cancel-modal__btn {
      border: none;
      border-radius: var(--radius-lg);
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      font-family: var(--font-body);
      cursor: pointer;
    }
    .cancel-modal__btn--ghost {
      border: 1px solid var(--border-default);
      background: transparent;
      color: var(--text-secondary);
    }
    .cancel-modal__btn--danger { background: var(--hul-danger); color: white; }
    .cancel-modal__btn:disabled { opacity: 0.5; cursor: not-allowed; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  loading$!: Observable<boolean>;
  currentFilter: string | null = null;
  showCancelModal = false;
  cancelOrderId: string | null = null;
  cancelOrderNumber = '';
  cancelReason = '';
  trackingMap: Record<string, any> = {};
  ratedOrders: Record<string, boolean> = {};
  showRateModal = false;
  rateShipmentId = '';
  rateOrderNumber = '';
  rateOrderId = '';
  private trackingLoadingOrderIds = new Set<string>();
  private autoPromptedOrderIds = new Set<string>();

  statusFilters = [
    { label: 'All', value: null },
    { label: 'Placed', value: 'Placed' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Ready to Ship', value: 'ReadyForDispatch' },
    { label: 'In Transit', value: 'InTransit' },
    { label: 'Delivered', value: 'Delivered' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  constructor(private store: Store, private router: Router, private http: ZoneHttpService) {
    this.loading$ = this.store.select(selectOrdersLoading);
  }

  ngOnInit() {
    this.store.dispatch(OrdersActions.loadMyOrders({}));
    this.store.select(selectFilteredOrders).subscribe(orders => {
      this.orders = orders;
      this.loadDeliveredTracking(orders);
      this.tryAutoOpenRateModal();
    });
    this.store.select(selectStatusFilter).subscribe(f => this.currentFilter = f);
  }

  filterByStatus(status: string | null): void {
    this.store.dispatch(OrdersActions.applyStatusFilter({ status }));
    if (status) {
      this.store.dispatch(OrdersActions.loadMyOrders({ status }));
    } else {
      this.store.dispatch(OrdersActions.loadMyOrders({}));
    }
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/dealer/orders', orderId]);
  }

  cancelOrder(orderId: string): void {
    const order = this.orders.find(o => o.orderId === orderId);
    this.cancelOrderId = orderId;
    this.cancelOrderNumber = order?.orderNumber || '';
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  isCancellable(status: string): boolean {
    return ['Placed', 'OnHold', 'Processing'].includes(status);
  }

  goToCatalog(): void {
    this.router.navigate(['/dealer/catalog']);
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelOrderId = null;
    this.cancelOrderNumber = '';
    this.cancelReason = '';
  }

  canSubmitCancellation(): boolean {
    return !!this.cancelReason.trim() && !!this.cancelOrderId;
  }

  openRateModal(order: any): void {
    const tracking = this.trackingMap[order.orderId];
    const shipmentId = tracking?.shipmentId || tracking?.ShipmentId;
    if (!shipmentId) return;

    this.showRateModal = true;
    this.rateShipmentId = shipmentId;
    this.rateOrderNumber = order.orderNumber || '';
    this.rateOrderId = order.orderId || '';
  }

  closeRateModal(): void {
    this.showRateModal = false;
    this.rateShipmentId = '';
    this.rateOrderNumber = '';
    this.rateOrderId = '';
  }

  onRated(event: { shipmentId: string; rating: number }): void {
    const knownOrderId = this.rateOrderId || this.findOrderIdByShipment(event.shipmentId);
    if (knownOrderId) {
      this.ratedOrders[knownOrderId] = true;
      const tracking = this.trackingMap[knownOrderId] || {};
      this.trackingMap[knownOrderId] = { ...tracking, customerRating: event.rating };
    }
    this.closeRateModal();
  }

  canRateOrder(order: any): boolean {
    if (order?.status !== 'Delivered') return false;
    if (this.ratedOrders[order.orderId]) return false;
    const tracking = this.trackingMap[order.orderId];
    const shipmentId = tracking?.shipmentId || tracking?.ShipmentId;
    return !!shipmentId && !tracking?.customerRating;
  }

  isOrderRated(order: any): boolean {
    if (order?.status !== 'Delivered') return false;
    const tracking = this.trackingMap[order.orderId];
    return !!this.ratedOrders[order.orderId] || !!tracking?.customerRating;
  }

  submitCancellation(): void {
    if (!this.cancelOrderId || !this.canSubmitCancellation()) return;

    this.store.dispatch(OrdersActions.cancelOrder({
      orderId: this.cancelOrderId,
      reason: this.cancelReason.trim()
    }));
    this.closeCancelModal();
  }

  private loadDeliveredTracking(orders: any[]): void {
    for (const order of orders) {
      if (order?.status !== 'Delivered' || !order?.orderId) continue;
      if (this.trackingMap[order.orderId] || this.trackingLoadingOrderIds.has(order.orderId)) continue;

      this.trackingLoadingOrderIds.add(order.orderId);
      this.http.get(API_ENDPOINTS.logistics.tracking(order.orderId)).subscribe({
        next: (tracking: any) => {
          this.trackingMap[order.orderId] = tracking;
          if (tracking?.customerRating) {
            this.ratedOrders[order.orderId] = true;
          }
          this.tryAutoOpenRateModal();
        },
        error: () => {
          this.trackingLoadingOrderIds.delete(order.orderId);
        },
        complete: () => {
          this.trackingLoadingOrderIds.delete(order.orderId);
        }
      });
    }
  }

  private tryAutoOpenRateModal(): void {
    if (this.showRateModal) return;

    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000;

    const candidates = this.orders
      .filter(order => {
        if (order?.status !== 'Delivered') return false;
        if (this.ratedOrders[order.orderId]) return false;
        if (this.autoPromptedOrderIds.has(order.orderId)) return false;
        const tracking = this.trackingMap[order.orderId];
        const shipmentId = tracking?.shipmentId || tracking?.ShipmentId;
        if (!shipmentId || tracking?.customerRating) return false;

        const deliveredAt = this.resolveDeliveredAt(order, tracking);
        if (!deliveredAt) return false;
        const deliveredMs = new Date(deliveredAt).getTime();
        return Number.isFinite(deliveredMs) && (now - deliveredMs) <= maxAgeMs;
      })
      .sort((a, b) => {
        const aMs = new Date(this.resolveDeliveredAt(a, this.trackingMap[a.orderId]) || 0).getTime();
        const bMs = new Date(this.resolveDeliveredAt(b, this.trackingMap[b.orderId]) || 0).getTime();
        return bMs - aMs;
      });

    const latestUnratedDelivered = candidates[0];
    if (!latestUnratedDelivered) return;

    this.autoPromptedOrderIds.add(latestUnratedDelivered.orderId);
    this.openRateModal(latestUnratedDelivered);
  }

  private resolveDeliveredAt(order: any, tracking: any): string | null {
    if (order?.deliveredAt) return order.deliveredAt;
    if (tracking?.deliveredAt) return tracking.deliveredAt;

    const history = tracking?.history;
    if (!Array.isArray(history)) return null;

    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if ((entry?.status || '').toLowerCase() === 'delivered' && entry?.recordedAt) {
        return entry.recordedAt;
      }
    }

    return null;
  }

  private findOrderIdByShipment(shipmentId: string): string {
    return Object.keys(this.trackingMap).find(orderId => {
      const tracking = this.trackingMap[orderId];
      return tracking?.shipmentId === shipmentId || tracking?.ShipmentId === shipmentId;
    }) || '';
  }
}
