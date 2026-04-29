import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { HulConfirmService } from '../../../../shared/ui/confirm-dialog/hul-confirm.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-products', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Products" subtitle="Manage product catalog">
        <div page-actions style="display:flex;gap:10px;">
          <button class="btn-filter" (click)="showFilters = !showFilters" [class.btn-filter--active]="activeFilterCount > 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            <span *ngIf="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
          <button class="btn-primary" (click)="openAddModal()">+ Add Product</button>
        </div>
      </hul-page-header>

      <!-- Advanced Filters Panel -->
      <div class="filters-panel" *ngIf="showFilters">
        <div class="filters-grid">
          <!-- Status -->
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <div class="filter-buttons">
              <button *ngFor="let s of ['All', 'Active', 'Inactive']" class="filter-btn"
                [class.filter-btn--active]="filters.status === s" (click)="filters.status = s; applyFilters()">
                {{ s }}
              </button>
            </div>
          </div>
          <!-- Price Range -->
          <div class="filter-group">
            <label class="filter-label">Price Range (INR)</label>
            <div class="filter-range">
              <input type="number" [(ngModel)]="filters.priceMin" placeholder="Min" class="filter-input" (change)="applyFilters()" min="0" />
              <span class="filter-range__sep">—</span>
              <input type="number" [(ngModel)]="filters.priceMax" placeholder="Max" class="filter-input" (change)="applyFilters()" min="0" />
            </div>
          </div>
          <!-- Stock Level -->
          <div class="filter-group">
            <label class="filter-label">Stock Level</label>
            <div class="filter-buttons">
              <button *ngFor="let s of stockLevels" class="filter-btn"
                [class.filter-btn--active]="filters.stock === s.value" (click)="filters.stock = s.value; applyFilters()">
                {{ s.label }}
              </button>
            </div>
          </div>
          <!-- Category -->
          <div class="filter-group">
            <label class="filter-label">Category</label>
            <select [(ngModel)]="filters.categoryId" class="filter-select" (change)="applyFilters()">
              <option value="">All Categories</option>
              <option *ngFor="let c of groupedFilterCategories" [value]="c.categoryId">{{ c.name }}</option>
            </select>
          </div>
          <!-- Brand -->
          <div class="filter-group">
            <label class="filter-label">Brand</label>
            <div class="filter-brand-list">
              <label *ngFor="let brand of availableBrands" class="filter-checkbox">
                <input type="checkbox" [checked]="filters.brands.includes(brand)" (change)="toggleBrandFilter(brand)" />
                {{ brand }}
              </label>
              <span *ngIf="availableBrands.length === 0" class="filter-empty">No brands</span>
            </div>
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn-text" (click)="clearFilters()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Clear All
          </button>
          <span class="filters-summary">{{ filteredProducts.length }} of {{ allProducts.length }} products shown</span>
        </div>
      </div>

      <hul-data-table [columns]="columns" [data]="pagedProducts" [loading]="loading" [totalCount]="filteredProducts.length"
        [currentPage]="currentPage" [pageSize]="pageSize" searchPlaceholder="Search by name, SKU, or brand..."
        emptyMessage="No products found" [actions]="tableActions"
        (searchChange)="onSearch($event)" (rowAction)="onAction($event)" (pageChange)="onPageChange($event)">
      </hul-data-table>

      <!-- Add/Edit Product Modal -->
      <hul-modal *ngIf="showModal" [open]="showModal" [title]="isEditing ? 'Edit Product' : 'Add Product'" size="lg" (close)="showModal = false">
        <div class="product-form">
          <div class="form-grid">
            <div class="form-group"><label>SKU <span class="req">*</span></label><input type="text" [(ngModel)]="form.sku" [disabled]="isEditing" class="form-input" style="text-transform:uppercase" placeholder="e.g. HUL-SHP-001" /></div>
            <div class="form-group"><label>Product Name <span class="req">*</span></label><input type="text" [(ngModel)]="form.name" class="form-input" placeholder="Product name" /></div>
            <div class="form-group"><label>Brand</label><input type="text" [(ngModel)]="form.brand" class="form-input" placeholder="e.g. Dove" /></div>
            <div class="form-group">
              <label>Category <span class="req">*</span></label>
              <select [(ngModel)]="form.categoryId" class="form-input">
                <option value="">Select category</option>
                <option *ngFor="let c of categories" [value]="c.categoryId">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group"><label>Unit Price (INR) <span class="req">*</span></label><input type="number" [(ngModel)]="form.unitPrice" class="form-input" min="0" /></div>
            <div class="form-group"><label>Min Order Qty <span class="req">*</span></label><input type="number" [(ngModel)]="form.minOrderQuantity" class="form-input" min="1" /></div>
            <div class="form-group" *ngIf="!isEditing"><label>Initial Stock</label><input type="number" [(ngModel)]="form.initialStock" class="form-input" min="0" /></div>
            <div class="form-group" *ngIf="isEditing">
              <label>Status</label>
              <select [(ngModel)]="form.status" class="form-input">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <!-- Image URL with Preview -->
          <div class="form-group">
            <label>Image URL</label>
            <input type="text" [(ngModel)]="form.imageUrl" class="form-input" placeholder="https://example.com/image.jpg" />
            <div class="image-preview" *ngIf="form.imageUrl">
              <img [src]="resolveImageUrl(form.imageUrl)" alt="Preview" (error)="onImageError($event)" />
              <span class="image-preview__label">Preview</span>
            </div>
          </div>
          <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description" class="form-input" rows="3" placeholder="Optional description..."></textarea></div>
          <div class="form-actions">
            <button *ngIf="isEditing" class="btn btn--danger" (click)="deleteProduct(form)" title="Permanently deactivate this product">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Product
            </button>
            <div style="display:flex;gap:10px;margin-left:auto;">
              <button class="btn btn--ghost" (click)="showModal = false">Cancel</button>
              <button class="btn btn--primary" [disabled]="!form.name?.trim() || !form.sku?.trim() || !form.unitPrice" (click)="saveProduct()">{{ isEditing ? 'Update' : 'Create' }}</button>
            </div>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .btn-primary { padding: 10px 20px; border-radius: var(--radius-lg); border: none; background: var(--hul-primary); color: white; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-primary:hover { background: var(--hul-primary-hover); }
    .btn-filter {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: var(--radius-lg);
      border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary);
      font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body); position: relative;
      transition: all 100ms ease;
    }
    .btn-filter:hover { border-color: var(--border-strong); color: var(--text-primary); }
    .btn-filter--active { border-color: var(--hul-primary); color: var(--hul-primary); background: var(--hul-primary-light); }
    .filter-badge {
      background: var(--hul-primary); color: white; font-size: 10px; font-weight: 700;
      padding: 1px 6px; border-radius: 9999px; min-width: 16px; text-align: center;
    }

    /* Filters Panel */
    .filters-panel {
      background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow-card);
      animation: slideDown 150ms ease;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .filters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); }
    .filter-buttons { display: flex; gap: 4px; flex-wrap: wrap; }
    .filter-btn {
      padding: 5px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);
      background: var(--bg-card); font-size: 12px; font-weight: 500; color: var(--text-secondary);
      cursor: pointer; transition: all 100ms; font-family: var(--font-body);
    }
    .filter-btn:hover { border-color: var(--border-strong); }
    .filter-btn--active { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }
    .filter-range { display: flex; align-items: center; gap: 6px; }
    .filter-range__sep { color: var(--text-tertiary); font-size: 12px; }
    .filter-input {
      flex: 1; padding: 6px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md);
      font-size: 13px; background: var(--bg-card); color: var(--text-primary); font-family: var(--font-mono);
      min-width: 60px;
    }
    .filter-input:focus { outline: none; border-color: var(--border-focus); }
    .filter-select {
      padding: 6px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md);
      font-size: 13px; background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body);
    }
    .filter-select:focus { outline: none; border-color: var(--border-focus); }
    .filter-brand-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; }
    .filter-checkbox { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
    .filter-checkbox input { accent-color: var(--hul-primary); }
    .filter-empty { font-size: 12px; color: var(--text-disabled); }
    .filters-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-default); }
    .btn-text {
      display: inline-flex; align-items: center; gap: 5px; background: none; border: none;
      font-size: 12px; font-weight: 500; color: var(--text-tertiary); cursor: pointer;
      font-family: var(--font-body); transition: color 100ms;
    }
    .btn-text:hover { color: var(--hul-danger); }
    .filters-summary { font-size: 12px; color: var(--text-tertiary); }

    /* Product Form */
    .product-form { padding: 8px 0; display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .req { color: var(--hul-danger); }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-input:disabled { opacity: .5; cursor: not-allowed; }
    textarea.form-input { min-height: 72px; resize: none; }
    .form-actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); display: inline-flex; align-items: center; gap: 6px; transition: all 150ms; }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--danger { background: var(--hul-danger); color: white; }
    .btn--danger:hover { background: #dc2626; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Image Preview */
    .image-preview {
      margin-top: 8px; display: inline-flex; align-items: center; gap: 10px;
      padding: 8px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-subtle);
    }
    .image-preview img { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); }
    .image-preview__label { font-size: 11px; color: var(--text-tertiary); }
  `]
})
export class AdminProductsComponent implements OnInit {
  loading = true; filteredProducts: any[] = []; pagedProducts: any[] = []; allProducts: any[] = []; categories: any[] = [];
  groupedFilterCategories: any[] = [];
  private categoryToGroupId: Record<string, string> = {};
  private groupedCategoryNameById: Record<string, string> = {};
  showModal = false; isEditing = false; showFilters = false;
  form: any = { sku: '', name: '', brand: '', categoryId: '', unitPrice: 0, minOrderQuantity: 1, initialStock: 0, description: '', imageUrl: '', status: 'Active' };

  // Original status tracked for edit — to know if it changed
  private originalStatus = 'Active';

  columns: DataTableColumn[] = [
    { key: 'sku', label: 'SKU', type: 'text', sortable: true },
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'categoryName', label: 'Category', type: 'text', sortable: true },
    { key: 'unitPrice', label: 'Price', type: 'currency-inr', sortable: true },
    { key: 'minOrderQuantity', label: 'Min Qty', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Active': 'success', 'Inactive': 'default' } },
    { key: 'availableStock', label: 'Stock', type: 'text', sortable: true },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];
  tableActions: DataTableAction[] = [
    { key: 'edit', label: 'Edit' },
  ];

  // Filter state
  filters = {
    status: 'All',
    priceMin: null as number | null,
    priceMax: null as number | null,
    stock: 'all',
    categoryId: '',
    brands: [] as string[],
  };
  stockLevels = [
    { label: 'All', value: 'all' },
    { label: 'In Stock', value: 'inStock' },
    { label: 'Low Stock', value: 'low' },
    { label: 'Out of Stock', value: 'out' },
  ];
  availableBrands: string[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  get activeFilterCount(): number {
    let c = 0;
    if (this.filters.status !== 'All') c++;
    if (this.filters.priceMin != null) c++;
    if (this.filters.priceMax != null) c++;
    if (this.filters.stock !== 'all') c++;
    if (this.filters.categoryId) c++;
    if (this.filters.brands.length > 0) c++;
    return c;
  }

  private catalogBaseUrl = '';

  constructor(private http: ZoneHttpService, private toast: ToastService, private confirm: HulConfirmService) {
    this.catalogBaseUrl = environment.useDirect ? environment.catalogServiceUrl : (environment.gatewayUrl || environment.catalogServiceUrl);
  }

  ngOnInit(): void {
    this.loadCategories(() => this.load());
  }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.catalog.products() + '?includeInactive=true').subscribe({
      next: p => {
        const catMap = this.buildCategoryMap();
        this.allProducts = p.map(prod => ({
          ...prod,
          // API returns prod.status as "Active" | "Inactive" string — use it directly
          status: prod.status || 'Active',
          availableStock: prod.availableStock ?? (prod.totalStock != null ? prod.totalStock - (prod.reservedStock || 0) : '—'),
          categoryName: catMap[prod.categoryId] || '—',
        }));
        this.computeAvailableBrands();
        this.applyFilters();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadCategories(callback?: () => void): void {
    this.http.get<any[]>(API_ENDPOINTS.catalog.categories() + '?includeInactive=true').subscribe({
      next: c => {
        this.categories = c;
        this.buildGroupedCategoryData();
        if (callback) callback();
      },
      error: () => { if (callback) callback(); }
    });
  }

  private normalizeName(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[\u2013\u2014\-]+/g, '-')
      .trim();
  }

  private getPrefixName(value: string): string {
    const name = (value || '').trim();
    const dashParts = name.split(/\s*[\u2013\u2014\-]\s*/);
    if (dashParts.length > 1) {
      return dashParts[0].trim();
    }
    return name;
  }

  private getFamilyKey(value: string): string {
    const normalized = this.normalizeName(this.getPrefixName(value))
      .replace(/\bcategories?\b/g, '')
      .replace(/&/g, ' ')
      .replace(/\band\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized || this.normalizeName(value);
  }

  private buildGroupedCategoryData(): void {
    const byId = new Map(this.categories.map(c => [c.categoryId, c]));
    const parent = new Map<string, string>();

    const find = (id: string): string => {
      const current = parent.get(id) ?? id;
      if (current !== id) {
        const root = find(current);
        parent.set(id, root);
        return root;
      }
      return id;
    };

    const union = (a: string, b: string): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) {
        parent.set(rb, ra);
      }
    };

    for (const category of this.categories) {
      parent.set(category.categoryId, category.categoryId);
    }

    for (const category of this.categories) {
      if (category.parentCategoryId && byId.has(category.parentCategoryId)) {
        union(category.categoryId, category.parentCategoryId);
      }
    }

    const familyBuckets = new Map<string, any[]>();
    for (const category of this.categories) {
      const key = this.getFamilyKey(category.name);
      if (!familyBuckets.has(key)) {
        familyBuckets.set(key, []);
      }
      familyBuckets.get(key)!.push(category);
    }

    for (const members of familyBuckets.values()) {
      if (members.length <= 1) {
        continue;
      }
      const first = members[0].categoryId;
      for (let i = 1; i < members.length; i++) {
        union(first, members[i].categoryId);
      }
    }

    const groups = new Map<string, any[]>();
    for (const category of this.categories) {
      const root = find(category.categoryId);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(category);
    }

    this.groupedFilterCategories = Array.from(groups.values()).map(members => {
      const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const representative =
        sorted.find(c => !c.parentCategoryId && !/[\u2013\u2014\-]/.test(c.name || '')) ||
        sorted.find(c => !/[\u2013\u2014\-]/.test(c.name || '')) ||
        sorted[0];

      return {
        categoryId: representative.categoryId,
        name: representative.name,
        memberCategoryIds: members.map(m => m.categoryId)
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    this.categoryToGroupId = {};
    this.groupedCategoryNameById = {};
    for (const group of this.groupedFilterCategories) {
      this.groupedCategoryNameById[group.categoryId] = group.name;
      for (const memberId of group.memberCategoryIds) {
        this.categoryToGroupId[memberId] = group.categoryId;
      }
    }
  }

  private buildCategoryMap(): Record<string, string> {
    const map: Record<string, string> = {};
    this.categories.forEach(c => {
      const groupedId = this.categoryToGroupId[c.categoryId] || c.categoryId;
      map[c.categoryId] = this.groupedCategoryNameById[groupedId] || c.name;
    });
    return map;
  }

  private computeAvailableBrands(): void {
    const brands = new Set<string>();
    this.allProducts.forEach(p => { if (p.brand) brands.add(p.brand); });
    this.availableBrands = Array.from(brands).sort();
  }

  // ========== Filtering ==========

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  toggleBrandFilter(brand: string): void {
    const idx = this.filters.brands.indexOf(brand);
    if (idx >= 0) this.filters.brands.splice(idx, 1);
    else this.filters.brands.push(brand);
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allProducts];

    // Search
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || p.brand?.toLowerCase().includes(s));
    }

    // Status
    if (this.filters.status === 'Active') result = result.filter(p => p.status === 'Active');
    else if (this.filters.status === 'Inactive') result = result.filter(p => p.status === 'Inactive');

    // Price range
    if (this.filters.priceMin != null) result = result.filter(p => p.unitPrice >= this.filters.priceMin!);
    if (this.filters.priceMax != null) result = result.filter(p => p.unitPrice <= this.filters.priceMax!);

    // Stock
    if (this.filters.stock === 'inStock') result = result.filter(p => (p.availableStock || 0) > 10);
    else if (this.filters.stock === 'low') result = result.filter(p => (p.availableStock || 0) > 0 && (p.availableStock || 0) <= 10);
    else if (this.filters.stock === 'out') result = result.filter(p => (p.availableStock || 0) <= 0);

    // Category
    if (this.filters.categoryId) {
      result = result.filter(p => (this.categoryToGroupId[p.categoryId] || p.categoryId) === this.filters.categoryId);
    }

    // Brand
    if (this.filters.brands.length > 0) result = result.filter(p => this.filters.brands.includes(p.brand));

    this.filteredProducts = result;
    this.currentPage = 1;
    this.updatePagedProducts();
  }

  clearFilters(): void {
    this.filters = { status: 'All', priceMin: null, priceMax: null, stock: 'all', categoryId: '', brands: [] };
    this.searchTerm = '';
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagedProducts();
  }

  private updatePagedProducts(): void {
    const totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
    this.currentPage = Math.min(Math.max(this.currentPage, 1), totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.pageSize);
  }

  // ========== CRUD ==========

  openAddModal(): void {
    this.isEditing = false;
    this.form = { sku: '', name: '', brand: '', categoryId: '', unitPrice: 0, minOrderQuantity: 1, initialStock: 0, description: '', imageUrl: '', status: 'Active' };
    this.showModal = true;
  }

  onAction(e: any): void {
    if (e.action === 'edit') {
      this.isEditing = true;
      this.originalStatus = e.row.status || 'Active';
      this.form = { ...e.row, status: e.row.status || 'Active' };
      this.showModal = true;
    }
  }

  deleteProduct(product: any): void {
    this.confirm.confirm({
      title: 'Permanently Delete Product?',
      message: `"${product.name}" will be permanently removed from the database and all categories. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      // Use hard-delete endpoint — permanently removes from DB so it never reappears
      this.http.delete(API_ENDPOINTS.catalog.hardDeleteProduct(product.productId)).subscribe({
        next: () => {
          this.toast.success(`"${product.name}" permanently deleted`);
          this.showModal = false;
          this.allProducts = this.allProducts.filter(p => p.productId !== product.productId);
          this.applyFilters();
        },
        error: err => this.toast.error(err.error?.error || 'Failed to delete product')
      });
    });
  }

  saveProduct(): void {
    if (this.isEditing) {
      // Build update payload
      const body: any = {
        name: this.form.name,
        description: this.form.description,
        brand: this.form.brand,
        unitPrice: this.form.unitPrice,
        minOrderQuantity: this.form.minOrderQuantity,
        imageUrl: this.form.imageUrl,
        categoryId: this.form.categoryId || null
      };

      // First update the product data
      this.http.put(API_ENDPOINTS.catalog.productById(this.form.productId), body).subscribe({
        next: () => {
          const newStatus = this.form.status;
          const productId = this.form.productId;

          // Helper: patch the local arrays in-place and close the modal
          const patchLocal = (status: string) => {
            const idx = this.allProducts.findIndex(p => p.productId === productId);
            if (idx !== -1) {
              this.allProducts[idx] = {
                ...this.allProducts[idx],
                ...body,
                categoryName: this.categories.find(c => c.categoryId === body.categoryId)?.name
                  || this.allProducts[idx].categoryName,
                status
              };
            }
            this.applyFilters();
            this.showModal = false;
          };

          if (newStatus !== this.originalStatus) {
            if (newStatus === 'Inactive') {
              this.http.delete(API_ENDPOINTS.catalog.productById(productId)).subscribe({
                next: () => { this.toast.success('Product updated and deactivated'); patchLocal('Inactive'); },
                error: () => { this.toast.warning('Product data saved but deactivation failed'); patchLocal(this.originalStatus); }
              });
            } else {
              this.http.put(API_ENDPOINTS.catalog.activateProduct(productId), {}).subscribe({
                next: () => { this.toast.success('Product updated and activated'); patchLocal('Active'); },
                error: () => { this.toast.warning('Product data saved but activation failed'); patchLocal(this.originalStatus); }
              });
            }
          } else {
            this.toast.success('Product updated');
            patchLocal(newStatus);
          }
        },
        error: err => this.toast.error(err.error?.error || 'Failed to save')
      });
    } else {
      // Create
      const body = { ...this.form, sku: this.form.sku.toUpperCase() };
      delete body.status;
      this.http.post(API_ENDPOINTS.catalog.products(), body).subscribe({
        next: () => {
          this.toast.success('Product created');
          this.showModal = false;
          this.load();
        },
        error: err => this.toast.error(err.error?.error || 'Failed to create product')
      });
    }
  }

  // ========== Image Helpers ==========

  resolveImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.catalogBaseUrl + url;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
