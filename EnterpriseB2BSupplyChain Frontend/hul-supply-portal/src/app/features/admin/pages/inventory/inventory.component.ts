import { Component, OnInit } from '@angular/core';
import { InventoryViewService } from '../../../../core/services/inventory-view.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-inventory', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Inventory" subtitle="Monitor stock levels across all products">
      </hul-page-header>

      <div *ngIf="criticalCount > 0" class="alert-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>{{ criticalCount }} products are critically low on stock</span>
      </div>

      <!-- Summary Bar -->
      <div class="summary-bar">
        <div class="summary-item"><span class="summary-value">{{ allProducts.length }}</span><span class="summary-label">Total Products</span></div>
        <div class="summary-item"><span class="summary-value" style="color:var(--text-primary)">{{ totalStockSum | number }}</span><span class="summary-label">Total Stock</span></div>
        <div class="summary-item"><span class="summary-value" style="color:#d97706">{{ reservedStockSum | number }}</span><span class="summary-label">Reserved Stock</span></div>
        <div class="summary-item"><span class="summary-value" style="color:#059669">{{ availableStockSum | number }}</span><span class="summary-label">Available Stock</span></div>
        <div class="summary-divider"></div>
        <div class="summary-item"><span class="summary-value" style="color:#059669">{{ inStockCount }}</span><span class="summary-label">In Stock</span></div>
        <div class="summary-item"><span class="summary-value" style="color:#ef4444">{{ outOfStockCount }}</span><span class="summary-label">Out of Stock</span></div>
        <div class="summary-item"><span class="summary-value" style="color:#d97706">{{ lowStockCount }}</span><span class="summary-label">Low Stock</span></div>
      </div>

      <!-- Stock Level Filter Chips -->
      <div class="filter-chips">
        <button class="chip" [class.chip--active]="stockFilter === 'all'" (click)="setStockFilter('all')">
          All <span class="chip__count">{{ allProducts.length }}</span>
        </button>
        <button class="chip chip--green" [class.chip--active]="stockFilter === 'inStock'" (click)="setStockFilter('inStock')">
          In Stock <span class="chip__count">{{ inStockCount }}</span>
        </button>
        <button class="chip chip--amber" [class.chip--active]="stockFilter === 'low'" (click)="setStockFilter('low')">
          Low Stock <span class="chip__count">{{ lowStockCount }}</span>
        </button>
        <button class="chip chip--red" [class.chip--active]="stockFilter === 'out'" (click)="setStockFilter('out')">
          Out of Stock <span class="chip__count">{{ outOfStockCount }}</span>
        </button>
      </div>

      <p class="stock-formula">Available = Total - Reserved (Reserved = stock tied to Placed / Processing / InTransit orders)</p>

      <!-- Inventory Table -->
      <div class="inv-table-wrap">
        <table class="inv-table" *ngIf="!loading">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Brand</th>
              <th class="text-right">Total</th>
              <th class="text-right">Reserved</th>
              <th class="text-right">Available</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of pagedProducts; trackBy: trackByProductId"
                [class.row--out]="(p.availableStock || 0) <= 0"
                [class.row--low]="(p.availableStock || 0) > 0 && (p.availableStock || 0) < 50"
                [class.row--ok]="(p.availableStock || 0) >= 50">
              <td class="mono">{{ p.sku }}</td>
              <td>{{ p.name }}</td>
              <td>{{ p.brand || '-' }}</td>
              <td class="text-right mono">{{ p.totalStock | number }}</td>
              <td class="text-right mono">{{ p.reservedStock | number }}</td>
              <td class="text-right mono fw-bold">{{ p.availableStock | number }}</td>
              <td>
                <span class="stock-badge"
                  [class.stock-badge--ok]="(p.availableStock || 0) >= 50"
                  [class.stock-badge--low]="(p.availableStock || 0) > 0 && (p.availableStock || 0) < 50"
                  [class.stock-badge--out]="(p.availableStock || 0) <= 0">
                  {{ (p.availableStock || 0) <= 0 ? 'Out of Stock' : (p.availableStock || 0) < 50 ? 'Low Stock' : 'In Stock' }}
                </span>
              </td>
              <td>
                <div class="inv-actions">
                  <button class="inv-action-btn" (click)="openRestock(p)" title="Restock">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button class="inv-action-btn" (click)="openEditStock(p)" title="Edit Stock">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="products.length === 0">
              <td colspan="8" class="empty-row">No products match the current filter.</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!loading && products.length > pageSize" class="inv-pagination">
          <span class="inv-pagination__info">
            Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ min(currentPage * pageSize, products.length) }} of {{ products.length }}
          </span>
          <div class="inv-pagination__controls">
            <button class="inv-page-btn" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">←</button>
            <button *ngFor="let page of visiblePages"
                    class="inv-page-btn"
                    [class.inv-page-btn--active]="page === currentPage"
                    (click)="goToPage(page)">
              {{ page }}
            </button>
            <button class="inv-page-btn" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">→</button>
          </div>
        </div>
        <div *ngIf="loading" class="inv-loading">
          <div *ngFor="let i of [1,2,3,4,5,6,7,8]" class="skeleton" style="height:40px;border-radius:var(--radius-sm);margin-bottom:4px"></div>
        </div>
      </div>

      <!-- Restock Modal -->
      <hul-modal *ngIf="showRestock" [open]="showRestock" title="Restock Product" size="sm" (close)="showRestock = false">
        <div class="inventory-modal">
          <p class="inventory-modal__intro">{{ restockProduct?.name }} ({{ restockProduct?.sku }})</p>
          <div class="inventory-modal__stats">
            <div class="inventory-modal__stat"><span>Current Total</span><strong>{{ restockProduct?.totalStock | number }}</strong></div>
            <div class="inventory-modal__stat"><span>Available</span><strong>{{ restockProduct?.availableStock | number }}</strong></div>
          </div>
          <div class="inventory-modal__field">
            <label>Quantity to Add</label>
            <input type="number" [(ngModel)]="restockQty" min="1" class="inventory-modal__input" placeholder="Enter quantity..." />
          </div>
          <div class="inventory-modal__field">
            <label>Notes (optional)</label>
            <input type="text" [(ngModel)]="restockNotes" class="inventory-modal__input" placeholder="e.g. Warehouse replenishment" />
          </div>
          <div class="inventory-modal__actions">
            <button (click)="showRestock = false" class="inventory-modal__btn inventory-modal__btn--ghost">Cancel</button>
            <button [disabled]="!restockQty || restockQty <= 0" (click)="submitRestock()" class="inventory-modal__btn inventory-modal__btn--primary">Add Stock</button>
          </div>
        </div>
      </hul-modal>

      <!-- Edit Stock Modal -->
      <hul-modal *ngIf="showEditStock" [open]="showEditStock" title="Edit Stock Level" size="sm" (close)="showEditStock = false">
        <div class="inventory-modal">
          <p class="inventory-modal__intro">{{ editProduct?.name }} ({{ editProduct?.sku }})</p>
          <div class="inventory-modal__stats">
            <div class="inventory-modal__stat"><span>Current Total</span><strong>{{ editProduct?.totalStock | number }}</strong></div>
            <div class="inventory-modal__stat"><span>Reserved</span><strong>{{ editProduct?.reservedStock | number }}</strong></div>
          </div>
          <div class="inventory-modal__field">
            <label>New Total Stock</label>
            <input type="number" [(ngModel)]="editStockValue" min="0" class="inventory-modal__input" />
          </div>
          <div class="inventory-modal__field">
            <label>Notes (optional)</label>
            <input type="text" [(ngModel)]="editStockNotes" class="inventory-modal__input" placeholder="e.g. Stock correction" />
          </div>
          <div class="inventory-modal__actions">
            <button (click)="showEditStock = false" class="inventory-modal__btn inventory-modal__btn--ghost">Cancel</button>
            <button [disabled]="editStockValue == null || editStockValue < 0" (click)="submitEditStock()" class="inventory-modal__btn inventory-modal__btn--primary">Update Stock</button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .alert-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: var(--radius-lg); background: #fffbeb; border: 1px solid #fcd34d; color: #d97706; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
    :host-context(.dark) .alert-banner { background: rgba(217,119,6,.08); border-color: rgba(217,119,6,.3); }
    .summary-bar { display: flex; gap: 24px; margin-bottom: 16px; padding: 16px 20px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); flex-wrap: wrap; }
    .summary-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .summary-value { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text-primary); }
    .summary-label { font-size: 12px; color: var(--text-tertiary); }
    .summary-divider { width: 1px; background: var(--border-default); align-self: stretch; margin: 4px 0; }
    .stock-formula { font-size: 12px; color: var(--text-tertiary); margin: 0 0 16px; padding: 0 4px; font-style: italic; }

    /* Filter Chips */
    .filter-chips { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px;
      border: 1px solid var(--border-default); background: var(--bg-card); font-size: 13px; font-weight: 500;
      color: var(--text-secondary); cursor: pointer; font-family: var(--font-body); transition: all 100ms;
    }
    .chip:hover { border-color: var(--border-strong); }
    .chip--active { font-weight: 600; }
    .chip--active.chip--green { background: rgba(5,150,105,.1); color: #059669; border-color: rgba(5,150,105,.3); }
    .chip--active.chip--amber { background: rgba(217,119,6,.1); color: #d97706; border-color: rgba(217,119,6,.3); }
    .chip--active.chip--red   { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.3); }
    .chip--active:not(.chip--green):not(.chip--amber):not(.chip--red) { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }
    .chip__count { font-size: 11px; font-weight: 700; opacity: .7; }

    /* Table */
    .inv-table-wrap { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); overflow-x: auto; border: 1px solid var(--border-default); }
    .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .inv-table th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); border-bottom: 1px solid var(--border-default); background: var(--bg-subtle); white-space: nowrap; }
    .inv-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-default); color: var(--text-primary); }
    .inv-table tbody tr:last-child td { border-bottom: none; }
    .inv-table tbody tr:hover { background: var(--bg-muted); }
    .text-right { text-align: right !important; }
    .mono { font-family: var(--font-mono); }
    .fw-bold { font-weight: 700; }
    .empty-row { text-align: center; color: var(--text-tertiary); padding: 32px 14px !important; }

    /* Row color coding */
    .row--out td:nth-child(6) { color: #ef4444; }
    .row--low td:nth-child(6) { color: #d97706; }
    .row--ok  td:nth-child(6) { color: #059669; }
    .row--out { background: rgba(239,68,68,.03); }
    .row--low { background: rgba(217,119,6,.03); }

    /* Stock Badge */
    .stock-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; white-space: nowrap; }
    .stock-badge--ok  { background: rgba(5,150,105,.1); color: #059669; }
    .stock-badge--low { background: rgba(217,119,6,.1); color: #d97706; }
    .stock-badge--out { background: rgba(239,68,68,.1); color: #ef4444; }

    /* Actions */
    .inv-actions { display: flex; gap: 4px; }
    .inv-action-btn {
      background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 5px;
      border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: all 100ms;
    }
    .inv-action-btn:hover { background: var(--bg-muted); color: var(--text-primary); }

    .inv-btn { padding: 8px 18px; border-radius: var(--radius-md); border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body); display: inline-flex; align-items: center; gap: 6px; }
    .inv-btn--primary { background: var(--hul-primary); color: white; }
    .inv-btn--primary:hover { background: var(--hul-primary-hover); }

    .inv-loading { padding: 16px; }
    .inv-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border-default); background: var(--bg-card); }
    .inv-pagination__info { font-size: 13px; color: var(--text-tertiary); }
    .inv-pagination__controls { display: flex; gap: 4px; flex-wrap: wrap; }
    .inv-page-btn {
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card);
      color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500; transition: all var(--duration-fast);
    }
    .inv-page-btn:hover:not(:disabled) { background: var(--bg-muted); color: var(--text-primary); }
    .inv-page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .inv-page-btn--active { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }

    /* Modal */
    .inventory-modal { display: flex; flex-direction: column; gap: 16px; min-height: 280px; }
    .inventory-modal__intro { margin: 0; color: var(--text-primary); font-size: 15px; font-weight: 600; line-height: 1.5; }
    .inventory-modal__stats { display: flex; gap: 12px; }
    .inventory-modal__stat { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-subtle); border: 1px solid var(--border-default); }
    .inventory-modal__stat span { font-size: 11px; color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: .03em; }
    .inventory-modal__stat strong { font-size: 18px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .inventory-modal__field label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .inventory-modal__input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 14px; box-sizing: border-box; }
    .inventory-modal__input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .inventory-modal__actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: auto; }
    .inventory-modal__btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; }
    .inventory-modal__btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .inventory-modal__btn--primary { background: var(--hul-primary); color: white; }
    .inventory-modal__btn:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class InventoryComponent implements OnInit {
  loading = true;
  products: any[] = [];
  allProducts: any[] = [];
  pageSize = 10;
  currentPage = 1;
  criticalCount = 0;
  inStockCount = 0;
  outOfStockCount = 0;
  lowStockCount = 0;
  totalStockSum = 0;
  reservedStockSum = 0;
  availableStockSum = 0;

  stockFilter: 'all' | 'inStock' | 'low' | 'out' = 'all';
  searchTerm = '';

  // Restock modal
  showRestock = false;
  restockProduct: any = null;
  restockQty = 0;
  restockNotes = '';

  // Edit stock modal
  showEditStock = false;
  editProduct: any = null;
  editStockValue: number | null = null;
  editStockNotes = '';

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.products.length / this.pageSize));
  }

  get pagedProducts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.products.slice(start, start + this.pageSize);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  constructor(private http: ZoneHttpService, private inventoryView: InventoryViewService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.inventoryView.getInventorySnapshot().subscribe({
      next: products => {
        this.allProducts = products.sort((a: any, b: any) => (a.availableStock || 0) - (b.availableStock || 0));
        this.computeStats();
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  private computeStats(): void {
    const p = this.allProducts;
    this.criticalCount = p.filter((x: any) => (x.availableStock || 0) < 20).length;
    this.inStockCount = p.filter((x: any) => (x.availableStock || 0) >= 50).length;
    this.outOfStockCount = p.filter((x: any) => (x.availableStock || 0) <= 0).length;
    this.lowStockCount = p.filter((x: any) => (x.availableStock || 0) > 0 && (x.availableStock || 0) < 50).length;
    this.totalStockSum = p.reduce((s: number, x: any) => s + (x.totalStock || 0), 0);
    this.reservedStockSum = p.reduce((s: number, x: any) => s + (x.reservedStock || 0), 0);
    this.availableStockSum = p.reduce((s: number, x: any) => s + (x.availableStock || 0), 0);
  }

  setStockFilter(filter: 'all' | 'inStock' | 'low' | 'out'): void {
    this.stockFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.allProducts];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
    }
    if (this.stockFilter === 'inStock') result = result.filter(p => (p.availableStock || 0) >= 50);
    else if (this.stockFilter === 'low') result = result.filter(p => (p.availableStock || 0) > 0 && (p.availableStock || 0) < 50);
    else if (this.stockFilter === 'out') result = result.filter(p => (p.availableStock || 0) <= 0);
    this.products = result;
    this.currentPage = 1;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  trackByProductId(_: number, item: any): string { return item.productId; }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  min(a: number, b: number): number { return Math.min(a, b); }

  // ========== Restock ==========

  openRestock(product: any): void {
    this.restockProduct = product;
    this.restockQty = 0;
    this.restockNotes = '';
    this.showRestock = true;
  }

  openAddStock(): void {
    if (this.allProducts.length > 0) {
      this.openRestock(this.allProducts[0]);
    }
  }

  submitRestock(): void {
    this.http.post(API_ENDPOINTS.inventory.restock(), { productId: this.restockProduct.productId, quantity: this.restockQty, notes: this.restockNotes || null }).subscribe({
      next: () => {
        this.toast.success(`${this.restockQty} units added to ${this.restockProduct.name}`);
        this.showRestock = false;
        this.load();
      },
      error: err => this.toast.error(err.error?.error || 'Restock failed')
    });
  }

  // ========== Edit Stock ==========

  openEditStock(product: any): void {
    this.editProduct = product;
    this.editStockValue = product.totalStock || 0;
    this.editStockNotes = '';
    this.showEditStock = true;
  }

  submitEditStock(): void {
    if (this.editStockValue == null || this.editStockValue < 0) return;
    const diff = this.editStockValue - (this.editProduct.totalStock || 0);
    if (diff === 0) {
      this.showEditStock = false;
      return;
    }
    // Use restock API with the difference (positive = add, if API supports negative for removal)
    this.http.post(API_ENDPOINTS.inventory.restock(), { productId: this.editProduct.productId, quantity: diff, notes: this.editStockNotes || 'Stock adjustment' }).subscribe({
      next: () => {
        this.toast.success(`Stock updated for ${this.editProduct.name}`);
        this.showEditStock = false;
        this.load();
      },
      error: err => this.toast.error(err.error?.error || 'Stock update failed')
    });
  }
}
