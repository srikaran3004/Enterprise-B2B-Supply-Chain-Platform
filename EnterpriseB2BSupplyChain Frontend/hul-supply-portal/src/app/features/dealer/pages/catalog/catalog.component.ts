import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import * as CatalogActions from '../../../../store/catalog/catalog.actions';
import * as CartActions from '../../../../store/cart/cart.actions';
import { selectProducts, selectCatalogLoading, selectCategories } from '../../../../store/catalog/catalog.reducer';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-catalog',
  standalone: false,
  template: `
    <div class="catalog">
      <hul-page-header title="Product Catalog" subtitle="Browse and order from our wholesale inventory"
        [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Catalog'}]">
      </hul-page-header>

      <div class="catalog__layout">
        <!-- Filter Panel -->
        <aside class="catalog__filters">
          <div class="filter-section">
            <label class="filter-label">Search</label>
            <div class="filter-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search products..." [(ngModel)]="searchTerm" (input)="onSearchChange()" class="filter-search__input" />
            </div>
          </div>

          <div class="filter-section">
            <label class="filter-label">Stock</label>
            <div class="filter-radio">
              <label><input type="radio" name="stock" [value]="false" [(ngModel)]="inStockOnly" (change)="applyFilters()"> All products</label>
              <label><input type="radio" name="stock" [value]="true" [(ngModel)]="inStockOnly" (change)="applyFilters()"> In stock only</label>
            </div>
          </div>

          <div class="filter-section" *ngIf="categories.length > 0">
            <label class="filter-label">Category</label>
            <div class="filter-checkbox-list">
              <label *ngFor="let cat of categories" class="filter-checkbox">
                <input type="checkbox" [checked]="selectedCategory === cat.categoryId"
                  (change)="onCategoryChange(cat.categoryId, $event)" />
                {{ cat.name }}
              </label>
            </div>
          </div>

          <div class="filter-section" *ngIf="availableBrands.length > 0">
            <label class="filter-label">Brand</label>
            <div class="filter-checkbox-list">
              <label *ngFor="let brand of availableBrands" class="filter-checkbox">
                <input type="checkbox" [checked]="selectedBrands.has(brand)"
                  (change)="onBrandChange(brand, $event)" />
                {{ brand }}
              </label>
            </div>
          </div>

          <button *ngIf="hasActiveFilters()" class="filter-reset" (click)="resetFilters()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Reset Filters
          </button>
        </aside>

        <!-- Product Grid -->
        <div class="catalog__grid-container">
          <hul-skeleton *ngIf="loading$ | async" type="product-card" [count]="6"></hul-skeleton>

          <div class="catalog__grid" *ngIf="!(loading$ | async)">
            <div *ngFor="let product of filteredProducts; let i = index"
                 class="product-card" [style.animation-delay]="(i * 40) + 'ms'">
              <!-- Stock badge -->
              <div class="product-card__badges">
                <span *ngIf="!product.isInStock" class="product-card__stock-badge product-card__stock-badge--out">Out of Stock</span>
                <span *ngIf="product.isInStock && product.availableStock < 50" class="product-card__stock-badge product-card__stock-badge--low">Low Stock</span>
              </div>

              <!-- Favorite button -->
              <button class="favorite-btn" (click)="toggleFavorite(product, $event)" [class.favorite-btn--active]="isFavorite(product.productId)" title="Add to favorites">
                <svg width="20" height="20" viewBox="0 0 24 24" [attr.fill]="isFavorite(product.productId) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              <div class="product-card__img" [style.background]="!product.imageUrl ? getProductColor(product.brand) : 'var(--bg-subtle)'">
                <img *ngIf="product.imageUrl" [src]="resolveImageUrl(product.imageUrl)" alt="" class="product-card__actual-img" (error)="onImgError($event, product)" />
                <span *ngIf="!product.imageUrl || product._imgFailed">{{ product.name?.charAt(0) }}</span>
              </div>

              <div class="product-card__body">
                <span class="product-card__brand">{{ product.brand || 'Unilever' }}</span>
                <span class="product-card__name">{{ product.name }}</span>
                <span class="product-card__sku">{{ product.sku }}</span>
                <span class="product-card__price">{{ product.unitPrice | inrCurrency }} / unit</span>
                <span class="product-card__meta">Min: {{ product.minOrderQuantity }} units</span>
                <span *ngIf="product.isInStock" class="product-card__stock">{{ product.availableStock }} units available</span>

                <div class="product-card__actions" *ngIf="product.isInStock">
                  <div class="qty-stepper">
                    <button (click)="decrementQty(product)" [disabled]="getQty(product) <= product.minOrderQuantity">−</button>
                    <span>{{ getQty(product) }}</span>
                    <button (click)="incrementQty(product)">+</button>
                  </div>
                  <hul-button variant="primary" size="sm" (click)="addToCart(product)">Add to Cart</hul-button>
                </div>
                <hul-button *ngIf="!product.isInStock" variant="outline" size="sm" [fullWidth]="true" style="margin-top: 8px;">
                  Notify Me
                </hul-button>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <hul-empty-state *ngIf="!(loading$ | async) && filteredProducts.length === 0"
            icon="search" title="No products found"
            description="Try adjusting your filters or search term"
            actionLabel="Clear Filters" (action)="resetFilters()">
          </hul-empty-state>

          <!-- Load indicator -->
          <p *ngIf="!(loading$ | async) && filteredProducts.length > 0" class="catalog__count">
            Showing {{ filteredProducts.length }} products
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .catalog { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .catalog__layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 24px;
      align-items: start;
    }

    .catalog__filters {
      position: sticky;
      top: 88px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      /* Custom scrollbar */
      scrollbar-width: thin;
      scrollbar-color: var(--border-default) transparent;
    }

    .catalog__filters::-webkit-scrollbar { width: 4px; }
    .catalog__filters::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
    .catalog__filters::-webkit-scrollbar-track { background: transparent; }

    .filter-section { }

    .filter-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      margin-bottom: 10px;
    }

    .filter-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 36px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
    }

    .filter-search:focus-within { border-color: var(--border-focus); }

    .filter-search__input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 13px;
      color: var(--text-primary);
      font-family: var(--font-body);
    }

    .filter-radio, .filter-checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-radio label, .filter-checkbox {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .filter-radio input, .filter-checkbox input {
      accent-color: var(--hul-primary);
    }

    .filter-reset {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: none;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-tertiary);
      cursor: pointer;
      font-family: var(--font-body);
      transition: all var(--duration-fast) var(--ease-out);
    }

    .filter-reset:hover { border-color: var(--hul-danger); color: var(--hul-danger); }

    .catalog__grid-container { flex: 1; min-width: 0; }

    .catalog__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .product-card {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      animation: fadeIn 300ms var(--ease-out) both;
      transition: transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out);
      position: relative;
    }

    .product-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

    .product-card__badges { position: absolute; top: 8px; right: 8px; z-index: 1; }

    .product-card__stock-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }

    .product-card__stock-badge--out { background: rgba(239, 68, 68, 0.9); color: white; }
    .product-card__stock-badge--low { background: rgba(245, 158, 11, 0.9); color: white; }

    .favorite-btn { position: absolute; top: 8px; left: 8px; z-index: 2; width: 36px; height: 36px; background: rgba(255, 255, 255, 0.9); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-tertiary); transition: all var(--duration-fast); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .favorite-btn:hover { background: white; color: #ef4444; transform: scale(1.1); }
    .favorite-btn--active { color: #ef4444; background: white; }
    .favorite-btn--active:hover { transform: scale(1.1); }

    .product-card__img {
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      font-family: var(--font-display);
      overflow: hidden;
      position: relative;
    }

    .product-card__actual-img {
      width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;
    }

    .product-card__body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .product-card__brand { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); }
    .product-card__name { font-size: 15px; font-weight: 500; color: var(--text-primary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .product-card__sku { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .product-card__price { font-size: 18px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); margin-top: 6px; }
    .product-card__meta { font-size: 12px; color: var(--text-tertiary); }
    .product-card__stock { font-size: 12px; color: var(--hul-success); font-weight: 500; }

    .product-card__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }

    .qty-stepper {
      display: flex;
      align-items: center;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
    }

    .qty-stepper button {
      width: 30px;
      height: 30px;
      background: var(--bg-subtle);
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qty-stepper button:hover:not(:disabled) { background: var(--bg-muted); }
    .qty-stepper button:disabled { opacity: 0.3; cursor: not-allowed; }

    .qty-stepper span {
      width: 36px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .catalog__count {
      text-align: center;
      color: var(--text-tertiary);
      font-size: 13px;
      margin-top: 24px;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (max-width: 768px) {
      .catalog__layout { grid-template-columns: 1fr; }
      .catalog__filters { position: static; max-height: none; overflow-y: visible; }
      .catalog__grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    }
  `]
})
export class CatalogComponent implements OnInit, OnDestroy {
  products: any[] = [];
  filteredProducts: any[] = [];
  categories: any[] = [];
  availableBrands: string[] = [];
  loading$!: Observable<boolean>;

  searchTerm = '';
  inStockOnly = false;
  selectedCategory: string | null = null;
  selectedBrands: Set<string> = new Set();
  quantities: Record<string, number> = {};
  favorites: Set<string> = new Set();

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private brandColors: Record<string, string> = {
    'Dove': '#1a73e8', 'Surf': '#0d9488', 'Axe': '#1e293b', 'Rexona': '#16a34a',
    'Horlicks': '#d97706', 'Knorr': '#15803d', 'Vaseline': '#2563eb',
  };

  constructor(private store: Store, private toast: ToastService, private http: HttpClient) {
    this.loading$ = this.store.select(selectCatalogLoading);
  }

  ngOnInit() {
    this.store.dispatch(CatalogActions.loadCategories());
    this.store.dispatch(CatalogActions.loadProducts({ params: {} }));
    this.loadFavorites();

    this.store.select(selectProducts).pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.products = p;
      // Derive unique brands from the full product list
      const brands = [...new Set(p.map((x: any) => x.brand).filter(Boolean))].sort() as string[];
      this.availableBrands = brands;
      this.applyBrandFilter();
    });
    this.store.select(selectCategories).pipe(takeUntil(this.destroy$)).subscribe(c => this.categories = c);

    this.searchSubject.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
  }

  loadFavorites() {
    this.http.get<any[]>(API_ENDPOINTS.catalog.favorites()).subscribe({
      next: (favorites: any[]) => {
        this.favorites = new Set(favorites.map((f: any) => f.productId));
      },
      error: () => {}
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  onSearchChange(): void { this.searchSubject.next(this.searchTerm); }

  onCategoryChange(categoryId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedCategory = checked ? categoryId : null;
    this.applyFilters();
  }

  applyFilters(): void {
    this.store.dispatch(CatalogActions.applyFilter({
      filters: {
        searchTerm: this.searchTerm,
        inStockOnly: this.inStockOnly,
        categoryId: this.selectedCategory,
      }
    }));
  }


  onBrandChange(brand: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedBrands.add(brand);
    else this.selectedBrands.delete(brand);
    this.applyBrandFilter();
  }

  applyBrandFilter(): void {
    if (this.selectedBrands.size === 0) {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(p => this.selectedBrands.has(p.brand));
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.inStockOnly = false;
    this.selectedCategory = null;
    this.selectedBrands.clear();
    this.store.dispatch(CatalogActions.resetFilters());
    this.store.dispatch(CatalogActions.loadProducts({ params: {} }));
  }

  hasActiveFilters(): boolean {
    return !!this.searchTerm || this.inStockOnly || !!this.selectedCategory || this.selectedBrands.size > 0;
  }

  getQty(product: any): number {
    return this.quantities[product.productId] || product.minOrderQuantity || 1;
  }

  incrementQty(product: any): void {
    this.quantities[product.productId] = this.getQty(product) + 1;
  }

  decrementQty(product: any): void {
    const current = this.getQty(product);
    if (current > (product.minOrderQuantity || 1)) {
      this.quantities[product.productId] = current - 1;
    }
  }

  addToCart(product: any): void {
    const qty = this.getQty(product);
    this.store.dispatch(CartActions.addToCart({ product, quantity: qty }));
    this.toast.success(`Added ${product.name} to cart`);
  }

  getProductColor(brand: string): string {
    return this.brandColors[brand] || '#6366f1';
  }

  isFavorite(productId: string): boolean {
    return this.favorites.has(productId);
  }

  toggleFavorite(product: any, event: Event): void {
    event.stopPropagation();
    this.http.post<{isFavorited: boolean, message: string}>(
      API_ENDPOINTS.catalog.toggleFavorite(product.productId),
      {}
    ).subscribe({
      next: (response: any) => {
        if (response.isFavorited) {
          this.favorites.add(product.productId);
        } else {
          this.favorites.delete(product.productId);
        }
        this.toast.success(response.message);
      },
      error: () => {
        this.toast.error('Failed to update favorite');
      }
    });
  }

  resolveImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = environment.useDirect ? environment.catalogServiceUrl : (environment.gatewayUrl || environment.catalogServiceUrl);
    return base + url;
  }

  onImgError(event: Event, product: any): void {
    (event.target as HTMLImageElement).style.display = 'none';
    product._imgFailed = true;
  }
}
