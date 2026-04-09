import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { HulConfirmService } from '../../../../shared/ui/confirm-dialog/hul-confirm.service';

@Component({
  selector: 'app-admin-categories', standalone: false,
  styleUrls: ['./admin-categories.component.scss'],
  template: `
    <div class="page-container">
      <hul-page-header title="Categories" subtitle="Organize product catalog by category and brand">
        <button page-actions class="btn-add" (click)="openAddModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Category
        </button>
      </hul-page-header>

      <!-- KPI Stats Row -->
      <div class="stats-row">
        <div class="stat-pill">
          <div class="stat-pill__icon stat-pill__icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-pill__data">
            <span class="stat-pill__value">{{ categories.length }}</span>
            <span class="stat-pill__label">Total Categories</span>
          </div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill__icon stat-pill__icon--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-pill__data">
            <span class="stat-pill__value">{{ activeCount }}</span>
            <span class="stat-pill__label">Active</span>
          </div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill__icon stat-pill__icon--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div class="stat-pill__data">
            <span class="stat-pill__value">{{ inactiveCount }}</span>
            <span class="stat-pill__label">Inactive</span>
          </div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill__icon stat-pill__icon--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div class="stat-pill__data">
            <span class="stat-pill__value">{{ allProducts.length }}</span>
            <span class="stat-pill__label">Total Products</span>
          </div>
        </div>
      </div>

      <!-- Search + Filter Toolbar -->
      <div class="toolbar">
        <div class="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" [(ngModel)]="searchTerm" (input)="filterCategories()" placeholder="Search categories..." class="search-bar__input" />
          <span class="search-bar__count" *ngIf="searchTerm">{{ filteredCategories.length }} results</span>
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterCategories()" class="toolbar__select">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <!-- Category Cards Grid (3-4 columns) -->
      <div class="cat-grid">
        <div *ngIf="loading" class="cat-grid__loading">
          <div *ngFor="let i of [1,2,3,4,5,6,7,8]" class="skeleton-card">
            <div class="skeleton" style="height:48px;width:48px;border-radius:var(--radius-lg)"></div>
            <div style="flex:1">
              <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
              <div class="skeleton" style="height:12px;width:80%;border-radius:var(--radius-sm)"></div>
            </div>
          </div>
        </div>

        <div *ngIf="!loading && filteredCategories.length === 0" class="cat-grid__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p *ngIf="searchTerm">No categories match "{{ searchTerm }}"</p>
          <p *ngIf="!searchTerm">No categories yet. Create your first category.</p>
        </div>

        <div *ngFor="let cat of filteredCategories; let i = index" class="cat-card"
            [class.cat-card--inactive]="cat.isActive === false"
            [style.animation-delay]="(i * 30) + 'ms'">
          <!-- Card Header -->
          <div class="cat-card__top">
            <div class="cat-card__icon" [style.background]="getCategoryColor(cat.name)">
              {{ cat.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="cat-card__title-area">
              <span class="cat-card__name">{{ cat.name }}</span>
              <span class="cat-card__product-count">{{ getProductCount(cat.categoryId) }} products</span>
            </div>
            <!-- Status Dropdown -->
            <select class="cat-card__status-select"
              [class.cat-card__status-select--active]="cat.isActive !== false"
              [class.cat-card__status-select--inactive]="cat.isActive === false"
              [ngModel]="cat.isActive === false ? 'inactive' : 'active'"
              (ngModelChange)="toggleCategoryStatus(cat, $event)"
              (click)="$event.stopPropagation()">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <!-- Description -->
          <p class="cat-card__desc">{{ cat.description || 'No description' }}</p>

          <!-- Brands -->
          <div class="cat-card__brands" *ngIf="getCategoryBrands(cat.categoryId).length > 0">
            <span *ngFor="let brand of getCategoryBrands(cat.categoryId).slice(0, 4)" class="brand-pill"
              [style.background]="getBrandColor(brand)" [style.color]="getBrandTextColor(brand)">
              {{ brand }}
            </span>
            <span *ngIf="getCategoryBrands(cat.categoryId).length > 4" class="brand-pill brand-pill--more">
              +{{ getCategoryBrands(cat.categoryId).length - 4 }}
            </span>
          </div>

          <!-- Card Footer Actions -->
          <div class="cat-card__footer">
            <button class="cat-card__btn" (click)="openViewModal(cat)" title="View Details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
            <button class="cat-card__btn" (click)="openEditModal(cat)" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="cat-card__btn cat-card__btn--danger" (click)="deleteCategory(cat)" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- ===== Add / Edit Category Modal ===== -->
      <hul-modal *ngIf="showFormModal" [open]="showFormModal"
        [title]="isEditing ? 'Edit Category' : 'New Category'" size="md" (close)="showFormModal = false">
        <div class="category-form">
          <div class="form-group">
            <label>Category Name <span class="req">*</span></label>
            <input type="text" [(ngModel)]="formData.name" (input)="nameError = ''" placeholder="e.g. Personal Care, Beverages" class="form-input" />
            <p *ngIf="nameError" class="form-error">{{ nameError }}</p>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="formData.description" placeholder="Brief description of this category..." rows="3" class="form-input"></textarea>
          </div>
          <div class="form-group" *ngIf="isEditing">
            <label>Status</label>
            <select [(ngModel)]="formData.status" class="form-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showFormModal = false">Cancel</button>
            <button class="btn btn--primary" [disabled]="!formData.name.trim() || !!nameError || savingForm" (click)="saveCategory()">
              <span *ngIf="savingForm" class="spinner"></span>
              {{ isEditing ? 'Update Category' : 'Create Category' }}
            </button>
          </div>
        </div>
      </hul-modal>

      <!-- ===== View Category Detail Modal ===== -->
      <hul-modal *ngIf="showViewModal" [open]="showViewModal"
        [title]="viewCategory?.name || 'Category Details'" size="lg" (close)="showViewModal = false">
        <div class="category-detail" *ngIf="viewCategory">
          <!-- Header -->
          <div class="detail-header">
            <div class="detail-header__icon" [style.background]="getCategoryColor(viewCategory.name)">
              {{ viewCategory.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="detail-header__info">
              <h3>{{ viewCategory.name }}</h3>
              <p>{{ viewCategory.description || 'No description provided' }}</p>
            </div>
            <span class="detail-header__badge" [class.detail-header__badge--active]="viewCategory.isActive !== false"
              [class.detail-header__badge--inactive]="viewCategory.isActive === false">
              {{ viewCategory.isActive === false ? 'Inactive' : 'Active' }}
            </span>
          </div>

          <!-- Stats Row -->
          <div class="detail-stats">
            <div class="detail-stat">
              <span class="detail-stat__label">Products</span>
              <span class="detail-stat__value">{{ getProductCount(viewCategory.categoryId) }}</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat__label">Brands</span>
              <span class="detail-stat__value">{{ getCategoryBrands(viewCategory.categoryId).length }}</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat__label">Active Products</span>
              <span class="detail-stat__value">{{ getActiveProductCount(viewCategory.categoryId) }}</span>
            </div>
          </div>

          <!-- Brand Pills -->
          <div class="detail-section" *ngIf="getCategoryBrands(viewCategory.categoryId).length > 0">
            <h4>Brands</h4>
            <div class="brand-list">
              <span *ngFor="let brand of getCategoryBrands(viewCategory.categoryId)" class="brand-chip"
                [style.background]="getBrandColor(brand)" [style.color]="getBrandTextColor(brand)">
                {{ brand }}
                <span class="brand-chip__count">{{ getBrandProductCount(viewCategory.categoryId, brand) }}</span>
              </span>
            </div>
          </div>

          <!-- Product List -->
          <div class="detail-section">
            <h4>Products <span class="section-count">({{ getCategoryProducts(viewCategory.categoryId).length }})</span></h4>
            <div class="product-mini-list" *ngIf="getCategoryProducts(viewCategory.categoryId).length > 0">
              <div *ngFor="let product of getCategoryProducts(viewCategory.categoryId)" class="product-mini-item">
                <div class="product-mini-item__avatar" [style.background]="getBrandColor(product.brand || 'default')">
                  {{ product.name?.charAt(0) }}
                </div>
                <div class="product-mini-item__info">
                  <span class="product-mini-item__name">{{ product.name }}</span>
                  <span class="product-mini-item__meta">{{ product.sku }} &middot; {{ product.brand || 'No brand' }}</span>
                </div>
                <div class="product-mini-item__right">
                  <span class="product-mini-item__price">{{ product.unitPrice | currency:'INR':'symbol':'1.0-0' }}</span>
                  <span class="product-mini-item__status" [class.product-mini-item__status--inactive]="!product.isActive">
                    {{ product.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
            <div *ngIf="getCategoryProducts(viewCategory.categoryId).length === 0" class="product-mini-empty">
              No products in this category yet.
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="detail-modal-actions">
            <button class="btn btn--ghost" (click)="openEditModal(viewCategory); showViewModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Category
            </button>
            <button class="btn btn--danger" (click)="deleteCategory(viewCategory); showViewModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      </hul-modal>
    </div>
  `
})

export class AdminCategoriesComponent implements OnInit {
  loading = true;
  categories: any[] = [];
  filteredCategories: any[] = [];
  allProducts: any[] = [];
  activeCount = 0;
  inactiveCount = 0;

  // Search / Filter
  searchTerm = '';
  statusFilter = 'all';

  // Form Modal
  showFormModal = false;
  isEditing = false;
  formData = { name: '', description: '', status: 'active' };
  nameError = '';
  savingForm = false;
  editingCategoryId: string | null = null;

  // View Modal
  showViewModal = false;
  viewCategory: any = null;

  // Precomputed
  private productsByCategory: Record<string, any[]> = {};
  private brandsByCategory: Record<string, string[]> = {};

  private categoryColors = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
  ];
  private brandColorMap: Record<string, string> = {};

  constructor(
    private http: ZoneHttpService,
    private toast: ToastService,
    private confirm: HulConfirmService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loadCategories();
    this.loadProducts();
  }

  // ========== Data Loading ==========

  loadCategories(): void {
    if (this.categories.length === 0) this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.catalog.categories() + '?includeInactive=true').subscribe({
      next: c => {
        this.categories = c;
        this.computeStatusCounts();
        this.filterCategories();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadProducts(): void {
    this.http.get<any[]>(API_ENDPOINTS.catalog.products() + '?includeInactive=true').subscribe({
      next: products => {
        this.allProducts = products;
        this.recomputeMaps();
      },
      error: () => {}
    });
  }

  private computeStatusCounts(): void {
    this.activeCount = this.categories.filter(c => c.isActive !== false).length;
    this.inactiveCount = this.categories.filter(c => c.isActive === false).length;
  }

  private recomputeMaps(): void {
    this.productsByCategory = {};
    this.brandsByCategory = {};
    const allBrands = new Set<string>();
    for (const p of this.allProducts) {
      const catId = p.categoryId;
      if (!this.productsByCategory[catId]) this.productsByCategory[catId] = [];
      this.productsByCategory[catId].push(p);
      if (p.brand) allBrands.add(p.brand);
    }
    for (const catId of Object.keys(this.productsByCategory)) {
      const brands = new Set<string>();
      this.productsByCategory[catId].forEach(p => { if (p.brand) brands.add(p.brand); });
      this.brandsByCategory[catId] = Array.from(brands).sort();
    }
    this.assignBrandColors(Array.from(allBrands).sort());
  }

  private assignBrandColors(brands: string[]): void {
    const palette = [
      '#dbeafe:#1e40af', '#dcfce7:#166534', '#f3e8ff:#6b21a8', '#fef3c7:#92400e',
      '#fce7f3:#9d174d', '#cffafe:#155e75', '#fef9c3:#713f12', '#e0e7ff:#3730a3',
      '#ffe4e6:#9f1239', '#f0fdf4:#14532d', '#ecfdf5:#064e3b', '#fff7ed:#9a3412'
    ];
    brands.forEach((brand, i) => {
      this.brandColorMap[brand] = palette[i % palette.length];
    });
  }

  // ========== Filtering ==========

  filterCategories(): void {
    const s = this.searchTerm.trim().toLowerCase();
    let result = [...this.categories];
    if (s) {
      result = result.filter(c => c.name?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s));
    }
    if (this.statusFilter === 'active') {
      result = result.filter(c => c.isActive !== false);
    } else if (this.statusFilter === 'inactive') {
      result = result.filter(c => c.isActive === false);
    }
    this.filteredCategories = result;
  }

  // ========== View Helpers ==========

  getCategoryColor(name: string): string {
    if (!name) return this.categoryColors[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return this.categoryColors[hash % this.categoryColors.length];
  }

  getProductCount(categoryId: string): number {
    return this.productsByCategory[categoryId]?.length || 0;
  }

  getActiveProductCount(categoryId: string): number {
    return (this.productsByCategory[categoryId] || []).filter(p => p.isActive !== false).length;
  }

  getCategoryBrands(categoryId: string): string[] {
    return this.brandsByCategory[categoryId] || [];
  }

  getCategoryProducts(categoryId: string): any[] {
    return this.productsByCategory[categoryId] || [];
  }

  getBrandProductCount(categoryId: string, brand: string): number {
    return (this.productsByCategory[categoryId] || []).filter(p => p.brand === brand).length;
  }

  getBrandColor(brand: string): string {
    const entry = this.brandColorMap[brand] || '#f1f5f9:#475569';
    return entry.split(':')[0];
  }

  getBrandTextColor(brand: string): string {
    const entry = this.brandColorMap[brand] || '#f1f5f9:#475569';
    return entry.split(':')[1];
  }

  // ========== Status Toggle ==========

  toggleCategoryStatus(cat: any, newStatus: string): void {
    if (newStatus === 'active' && cat.isActive === false) {
      this.http.put(API_ENDPOINTS.catalog.activateCategory(cat.categoryId), {}).subscribe({
        next: () => {
          cat.isActive = true;
          this.computeStatusCounts();
          this.loadProducts();
          this.toast.success(`"${cat.name}" activated`);
        },
        error: err => this.toast.error(err.error?.error || 'Failed to activate category')
      });
    } else if (newStatus === 'inactive' && cat.isActive !== false) {
      this.http.put(API_ENDPOINTS.catalog.deactivateCategory(cat.categoryId), {}).subscribe({
        next: () => {
          cat.isActive = false;
          this.computeStatusCounts();
          this.filterCategories();
          this.loadProducts();
          this.toast.success(`"${cat.name}" deactivated`);
        },
        error: err => this.toast.error(err.error?.error || 'Failed to deactivate category')
      });
    }
  }

  // ========== Modals ==========

  openAddModal(): void {
    this.isEditing = false;
    this.editingCategoryId = null;
    this.formData = { name: '', description: '', status: 'active' };
    this.nameError = '';
    this.savingForm = false;
    this.showFormModal = true;
  }

  openEditModal(cat: any): void {
    this.isEditing = true;
    this.editingCategoryId = cat.categoryId;
    this.formData = { name: cat.name, description: cat.description || '', status: cat.isActive === false ? 'inactive' : 'active' };
    this.nameError = '';
    this.savingForm = false;
    this.showFormModal = true;
  }

  openViewModal(cat: any): void {
    this.viewCategory = cat;
    this.showViewModal = true;
    // Always re-fetch products when opening view so we never show stale data
    this.http.get<any[]>(API_ENDPOINTS.catalog.products() + '?includeInactive=true').subscribe({
      next: products => {
        this.allProducts = products;
        this.recomputeMaps();
      },
      error: () => {}
    });
  }

  // ========== CRUD ==========

  private checkDuplicateName(): boolean {
    const normalized = this.formData.name.trim().toLowerCase();
    const duplicate = this.categories.some(cat =>
      cat.name?.trim().toLowerCase() === normalized &&
      (!this.isEditing || cat.categoryId !== this.editingCategoryId)
    );
    this.nameError = duplicate ? 'A category with this name already exists' : '';
    return duplicate;
  }

  saveCategory(): void {
    if (!this.formData.name.trim() || this.checkDuplicateName()) return;
    this.savingForm = true;

    if (this.isEditing && this.editingCategoryId) {
      this.http.put(API_ENDPOINTS.catalog.categoryById(this.editingCategoryId), {
        name: this.formData.name,
        description: this.formData.description || null
      }).subscribe({
        next: () => {
          const cat = this.categories.find(c => c.categoryId === this.editingCategoryId);
          const wantActive = this.formData.status === 'active';
          const isCurrentlyActive = cat?.isActive !== false;

          const finalize = () => {
            this.toast.success('Category updated');
            this.showFormModal = false;
            this.savingForm = false;
            this.loadCategories();
            this.loadProducts();
          };

          if (cat && wantActive !== isCurrentlyActive) {
            const endpoint = wantActive
              ? API_ENDPOINTS.catalog.activateCategory(this.editingCategoryId!)
              : API_ENDPOINTS.catalog.deactivateCategory(this.editingCategoryId!);
            this.http.put(endpoint, {}).subscribe({ next: finalize, error: finalize });
          } else {
            finalize();
          }
        },
        error: err => {
          this.savingForm = false;
          this.nameError = err.error?.error?.includes('already exists') ? err.error.error : '';
          this.toast.error(err.error?.error || 'Failed to update category');
        }
      });
    } else {
      this.http.post(API_ENDPOINTS.catalog.categories(), {
        name: this.formData.name,
        description: this.formData.description || null,
        parentCategoryId: null
      }).subscribe({
        next: () => {
          this.toast.success('Category created');
          this.showFormModal = false;
          this.savingForm = false;
          this.loadCategories();
          this.loadProducts();
        },
        error: err => {
          this.savingForm = false;
          this.nameError = err.error?.error?.includes('already exists') ? err.error.error : '';
          this.toast.error(err.error?.error || 'Failed to create category');
        }
      });
    }
  }

  deleteCategory(cat: any): void {
    this.confirm.confirm({
      title: 'Delete Category?',
      message: `Delete "${cat.name}"? This will affect ${this.getProductCount(cat.categoryId)} products in this category.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.http.delete(API_ENDPOINTS.catalog.categoryById(cat.categoryId)).subscribe({
          next: () => {
            this.toast.success('Category deleted');
            this.loadCategories();
            this.loadProducts();
          },
          error: err => this.toast.error(err.error?.error || 'Failed to delete category')
        });
      }
    });
  }
}
