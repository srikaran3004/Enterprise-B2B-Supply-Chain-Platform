import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import * as OrdersActions from '../../../../store/orders/orders.actions';
import * as CatalogActions from '../../../../store/catalog/catalog.actions';
import { selectOrders, selectOrdersLoading } from '../../../../store/orders/orders.reducer';
import { selectProducts, selectCatalogLoading } from '../../../../store/catalog/catalog.reducer';
import * as CartActions from '../../../../store/cart/cart.actions';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { TableColumn } from '../../../../shared/ui/table/hul-table.component';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  template: `
    <div class="dashboard">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-banner__content">
          <h1 class="welcome-banner__greeting">{{ getGreeting() }}, {{ userName }} 👋</h1>
          <p class="welcome-banner__subtitle">Here's your business snapshot for today</p>
        </div>
        <div class="welcome-banner__pattern"></div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="kpi-card__content">
            <span class="kpi-card__value">{{ totalOrders }}</span>
            <span class="kpi-card__label">Total Orders</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div class="kpi-card__content">
            <span class="kpi-card__value">{{ activeOrders }}</span>
            <span class="kpi-card__label">Active Orders</span>
            <span class="kpi-card__dot" *ngIf="activeOrders > 0"></span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-card__content">
            <span class="kpi-card__value">{{ totalSpent | inrCurrency }}</span>
            <span class="kpi-card__label">Total Spent</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
          </div>
          <div class="kpi-card__content">
            <span class="kpi-card__value">{{ availableCredit | inrCurrency }}</span>
            <span class="kpi-card__label">Remaining Monthly Purchase Limit (resets on 1st) - {{ creditUtilization }}% utilized</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <h2 class="section__title">Purchase Limit Change History</h2>
          <select class="filter-select" [(ngModel)]="historyMonthFilter" (change)="applyHistoryFilter()">
            <option value="">All Months</option>
            <option *ngFor="let month of historyMonthOptions" [value]="month">{{ month }}</option>
          </select>
        </div>
        <div class="history-table-wrap" *ngIf="filteredPurchaseLimitHistory.length > 0; else noHistory">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Previous Limit</th>
                <th>New Limit</th>
                <th>Updated By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredPurchaseLimitHistory">
                <td>{{ row.changedAt | date:'medium' }}</td>
                <td>{{ row.previousLimit | inrCurrency }}</td>
                <td><strong>{{ row.newLimit | inrCurrency }}</strong></td>
                <td>{{ row.changedByRole || 'System' }}</td>
                <td>{{ row.reason || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noHistory>
          <div class="empty-history">No purchase-limit changes found.</div>
        </ng-template>
      </div>

      <!-- Recent Orders -->
      <div class="section">
        <div class="section__header">
          <h2 class="section__title">Recent Orders</h2>
          <a routerLink="/dealer/orders" class="section__link">View All →</a>
        </div>
        <hul-skeleton *ngIf="ordersLoading$ | async" type="table" [count]="5"></hul-skeleton>
        <hul-table *ngIf="!(ordersLoading$ | async)"
          [columns]="orderColumns"
          [data]="recentOrders"
          emptyMessage="No orders yet. Start by browsing our catalog!">
        </hul-table>
      </div>

      <!-- Featured Products -->
      <div class="section">
        <div class="section__header">
          <h2 class="section__title">Reorder your favorites</h2>
        </div>
        <div class="product-scroll" *ngIf="!(productsLoading$ | async)">
          <div *ngFor="let product of featuredProducts; let i = index"
               class="product-card" [style.animation-delay]="(i * 40) + 'ms'">
            <div class="product-card__img" [style.background]="getProductColor(product.brand)">
              {{ product.name?.charAt(0) }}
            </div>
            <div class="product-card__body">
              <span class="product-card__brand">{{ product.brand || 'Unilever' }}</span>
              <span class="product-card__name">{{ product.name }}</span>
              <span class="product-card__price">{{ product.unitPrice | inrCurrency }}/unit</span>
              <hul-badge [variant]="product.isInStock ? 'success' : 'danger'" size="sm">
                {{ product.isInStock ? 'In Stock' : 'Out of Stock' }}
              </hul-badge>
              <hul-button variant="primary" size="sm" [fullWidth]="true" [disabled]="!product.isInStock"
                (click)="addToCart(product)" style="margin-top: 8px;">
                {{ product.isInStock ? 'Add to Cart' : 'Out of Stock' }}
              </hul-button>
            </div>
          </div>
        </div>
        <hul-skeleton *ngIf="productsLoading$ | async" type="product-card" [count]="4"></hul-skeleton>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { animation: slideUp 300ms var(--ease-out); }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .welcome-banner {
      position: relative;
      background: linear-gradient(135deg, #0c4a6e, #0369a1);
      border-radius: var(--radius-xl);
      padding: 28px 32px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .welcome-banner__content { position: relative; z-index: 2; }

    .welcome-banner__greeting {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0 0 4px;
    }

    .welcome-banner__subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }

    .welcome-banner__pattern {
      position: absolute;
      inset: 0;
      opacity: 0.06;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 20px,
        white 20px,
        white 21px
      );
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      transition: transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out);
    }

    .kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

    .kpi-card__icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-card__icon--blue { background: #eff6ff; color: #2563eb; }
    .kpi-card__icon--amber { background: #fffbeb; color: #d97706; }
    .kpi-card__icon--green { background: #ecfdf5; color: #059669; }
    .kpi-card__icon--purple { background: #f5f3ff; color: #7c3aed; }

    :host-context(.dark) .kpi-card__icon--blue { background: rgba(37, 99, 235, 0.15); }
    :host-context(.dark) .kpi-card__icon--amber { background: rgba(217, 119, 6, 0.15); }
    :host-context(.dark) .kpi-card__icon--green { background: rgba(5, 150, 105, 0.15); }
    :host-context(.dark) .kpi-card__icon--purple { background: rgba(124, 58, 237, 0.15); }

    .kpi-card__content { display: flex; flex-direction: column; }

    .kpi-card__value {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .kpi-card__label {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    .kpi-card__dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #d97706;
      margin-top: 4px;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.5); }
    }

    .section { margin-bottom: 28px; }

    .section__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .section__title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .filter-select {
      padding: 7px 12px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      color: var(--text-primary);
      font-size: 13px;
      font-family: var(--font-body);
    }

    .history-table-wrap {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .history-table thead {
      background: var(--bg-muted);
    }

    .history-table th {
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .history-table td {
      padding: 10px 14px;
      border-top: 1px solid var(--border-default);
      color: var(--text-primary);
    }

    .empty-history {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      padding: 16px;
      color: var(--text-tertiary);
      font-size: 13px;
    }

    .section__link {
      font-size: 13px;
      font-weight: 600;
      color: var(--hul-primary);
      text-decoration: none;
    }

    .product-scroll {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .product-card {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      animation: fadeIn 300ms var(--ease-out) both;
      transition: transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out);
    }

    .product-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

    .product-card__img {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: rgba(255,255,255,0.8);
      font-family: var(--font-display);
    }

    .product-card__body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .product-card__brand {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-tertiary);
    }

    .product-card__name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-card__price {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-mono);
      margin-top: 4px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  userName = '';
  orders$!: Observable<any[]>;
  ordersLoading$!: Observable<boolean>;
  productsLoading$!: Observable<boolean>;

  recentOrders: any[] = [];
  featuredProducts: any[] = [];
  totalOrders = 0;
  activeOrders = 0;
  totalSpent = 0;
  availableCredit = 0;
  creditUtilization = 0;
  purchaseLimitHistory: any[] = [];
  filteredPurchaseLimitHistory: any[] = [];
  historyMonthOptions: string[] = [];
  historyMonthFilter = '';

  orderColumns: TableColumn[] = [
    { key: 'orderNumber', label: 'Order #', type: 'text' },
    { key: 'totalItems', label: 'Items', type: 'text' },
    { key: 'totalAmount', label: 'Total', type: 'currency' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'placedAt', label: 'Date', type: 'date' },
  ];

  private brandColors: Record<string, string> = {
    'Dove': '#1a73e8', 'Surf': '#0d9488', 'Axe': '#1e293b', 'Rexona': '#16a34a',
    'Horlicks': '#d97706', 'Knorr': '#15803d', 'Vaseline': '#2563eb',
    'default': '#6366f1',
  };

  constructor(
    private store: Store,
    private authService: AuthService,
    private toast: ToastService,
    private http: ZoneHttpService
  ) {
    this.userName = this.authService.getUserName() || 'there';
    this.ordersLoading$ = this.store.select(selectOrdersLoading);
    this.productsLoading$ = this.store.select(selectCatalogLoading);
  }

  ngOnInit() {
    this.store.dispatch(OrdersActions.loadMyOrders({}));
    this.store.dispatch(CatalogActions.loadProducts({ params: { inStockOnly: true } }));
    this.loadFavorites();

    this.store.select(selectOrders).subscribe(orders => {
      this.recentOrders = orders.slice(0, 5);
      this.totalOrders = orders.length;
      this.activeOrders = orders.filter(o => o.status === 'InTransit' || o.status === 'OutForDelivery' || o.status === 'Processing').length;
      this.totalSpent = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    });

    this.store.select(selectProducts).subscribe(products => {
      this.featuredProducts = products.slice(0, 8);
    });

    this.loadCreditSnapshot();
    this.loadPurchaseLimitHistory();
  }

  private loadCreditSnapshot(): void {
    const dealerId = this.authService.getDealerId();
    if (!dealerId) {
      this.availableCredit = 0;
      this.creditUtilization = 0;
      return;
    }

    this.http.get<any>(API_ENDPOINTS.payment.purchaseLimitAccount(dealerId)).subscribe({
      next: (credit) => {
        this.availableCredit = credit?.availableLimit ?? 0;
        this.creditUtilization = credit?.utilizationPercent ?? 0;
      },
      error: () => {
        this.availableCredit = 0;
        this.creditUtilization = 0;
      }
    });
  }

  private loadPurchaseLimitHistory(): void {
    const dealerId = this.authService.getDealerId();
    if (!dealerId) {
      this.purchaseLimitHistory = [];
      this.filteredPurchaseLimitHistory = [];
      return;
    }

    this.http.get<any[]>(API_ENDPOINTS.payment.purchaseLimitHistoryByDealer(dealerId)).subscribe({
      next: rows => {
        const data = Array.isArray(rows) ? rows : [];
        this.purchaseLimitHistory = data;
        const monthSet = new Set<string>();

        data.forEach(r => {
          const d = new Date(r.changedAt);
          if (Number.isNaN(d.getTime())) return;
          monthSet.add(d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }));
        });

        this.historyMonthOptions = Array.from(monthSet);
        this.applyHistoryFilter();
      },
      error: () => {
        this.purchaseLimitHistory = [];
        this.filteredPurchaseLimitHistory = [];
      }
    });
  }

  applyHistoryFilter(): void {
    if (!this.historyMonthFilter) {
      this.filteredPurchaseLimitHistory = [...this.purchaseLimitHistory];
      return;
    }

    this.filteredPurchaseLimitHistory = this.purchaseLimitHistory.filter(r => {
      const d = new Date(r.changedAt);
      if (Number.isNaN(d.getTime())) return false;
      const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      return label === this.historyMonthFilter;
    });
  }

  loadFavorites() {
    this.http.get<any[]>(API_ENDPOINTS.catalog.favorites()).subscribe({
      next: (favorites) => {
        this.featuredProducts = favorites.slice(0, 8);
      },
      error: () => {
        // Fallback to regular products if favorites fail
      }
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getProductColor(brand: string): string {
    return this.brandColors[brand] || this.brandColors['default'];
  }

  addToCart(product: any): void {
    this.store.dispatch(CartActions.addToCart({ product, quantity: product.minOrderQuantity || 1 }));
    this.toast.success('Added to cart');
  }
}
