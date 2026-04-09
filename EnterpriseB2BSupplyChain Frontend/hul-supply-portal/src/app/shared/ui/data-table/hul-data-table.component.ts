import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export type ColumnType = 'text' | 'badge' | 'date' | 'currency-inr' | 'boolean' | 'actions-menu';
export type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'default';

export interface DataTableColumn {
  key: string;
  label: string;
  type: ColumnType;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  badgeMap?: Record<string, BadgeVariant>;
}

export interface DataTableAction {
  key: string;
  label: string;
  icon?: string;
  variant?: 'danger' | 'primary' | 'default';
  condition?: (row: any) => boolean;
}

@Component({
  selector: 'hul-data-table',
  standalone: false,
  template: `
    <!-- Bulk action bar -->
    <div *ngIf="selectedRows.length > 0" class="dt-bulk-bar">
      <span class="dt-bulk-bar__count">{{ selectedRows.length }} row(s) selected</span>
      <button *ngFor="let action of actions" class="dt-bulk-bar__btn" (click)="onBulkAction(action.key)">{{ action.label }}</button>
      <button class="dt-bulk-bar__clear" (click)="clearSelection()">Clear</button>
    </div>

    <!-- Search bar -->
    <div class="dt-toolbar" *ngIf="searchPlaceholder">
      <div class="dt-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" [placeholder]="searchPlaceholder" (input)="onSearchInput($event)" class="dt-search__input" />
      </div>
    </div>

    <!-- Table -->
    <div class="dt-container">
      <table class="dt-table">
        <thead class="dt-thead">
          <tr>
            <th *ngIf="selectable" class="dt-th dt-th--check" style="width:44px">
              <input type="checkbox" [checked]="allSelected" (change)="toggleAll($event)" />
            </th>
            <th *ngFor="let col of columns" class="dt-th"
                [style.width]="col.width || 'auto'" [style.text-align]="col.align || 'left'"
                [class.dt-th--sortable]="col.sortable" (click)="col.sortable ? toggleSort(col.key) : null">
              {{ col.label }}
              <span *ngIf="col.sortable && sortColumn === col.key" class="dt-sort-icon">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="dt-tbody">
          <!-- Loading skeleton -->
          <ng-container *ngIf="loading">
            <tr *ngFor="let r of skeletonRows" class="dt-tr">
              <td *ngIf="selectable" class="dt-td"><div class="skeleton" style="width:16px;height:16px"></div></td>
              <td *ngFor="let col of columns" class="dt-td"><div class="skeleton" style="width:80%;height:14px;border-radius:4px"></div></td>
            </tr>
          </ng-container>

          <!-- Data rows -->
          <ng-container *ngIf="!loading && data.length > 0">
            <tr *ngFor="let row of data; let i = index" class="dt-tr" [class.dt-tr--alt]="i % 2 === 1"
                [class.dt-tr--selected]="isSelected(row)">
              <td *ngIf="selectable" class="dt-td dt-td--check">
                <input type="checkbox" [checked]="isSelected(row)" (change)="toggleRow(row)" />
              </td>
              <td *ngFor="let col of columns" class="dt-td" [style.text-align]="col.align || 'left'">
                <!-- Text -->
                <span *ngIf="col.type === 'text'">{{ row[col.key] }}</span>
                <!-- Badge -->
                <span *ngIf="col.type === 'badge'" class="dt-badge dt-badge--{{ getBadgeVariant(col, row[col.key]) }}">{{ row[col.key] }}</span>
                <!-- Date -->
                <span *ngIf="col.type === 'date'">{{ row[col.key] | date:'mediumDate' }}</span>
                <!-- Currency -->
                <span *ngIf="col.type === 'currency-inr'" class="dt-currency">₹{{ formatNumber(row[col.key]) }}</span>
                <!-- Boolean -->
                <span *ngIf="col.type === 'boolean'" class="dt-bool-badge dt-bool-badge--{{ row[col.key] ? 'true' : 'false' }}">{{ getBooleanLabel(col, row) }}</span>
                <!-- Actions menu -->
                <div *ngIf="col.type === 'actions-menu'" class="dt-actions">
                  <ng-container *ngFor="let action of getRowActions(row)">
                    <button class="dt-action-btn dt-action-btn--{{ action.variant || 'default' }}" (click)="onRowAction(action.key, row)" [title]="action.label">{{ action.label }}</button>
                  </ng-container>
                </div>
              </td>
            </tr>
          </ng-container>

          <!-- Empty -->
          <tr *ngIf="!loading && data.length === 0">
            <td [attr.colspan]="columns.length + (selectable ? 1 : 0)" class="dt-empty">
              {{ emptyMessage || 'No data found' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div *ngIf="totalCount > pageSize" class="dt-pagination">
      <span class="dt-pagination__info">Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ min(currentPage * pageSize, totalCount) }} of {{ totalCount }}</span>
      <div class="dt-pagination__controls">
        <button class="dt-page-btn" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">←</button>
        <button *ngFor="let p of visiblePages" class="dt-page-btn" [class.dt-page-btn--active]="p === currentPage" (click)="goToPage(p)">{{ p }}</button>
        <button class="dt-page-btn" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">→</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dt-bulk-bar {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      background: var(--hul-primary); color: white; border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      animation: slideUp 200ms var(--ease-out); font-size: 13px;
    }
    .dt-bulk-bar__btn { background: rgba(255,255,255,.2); border: none; color: white; padding: 6px 14px; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; font-weight: 500; }
    .dt-bulk-bar__btn:hover { background: rgba(255,255,255,.3); }
    .dt-bulk-bar__clear { margin-left: auto; background: none; border: none; color: rgba(255,255,255,.7); cursor: pointer; font-size: 13px; text-decoration: underline; }
    .dt-toolbar { padding: 12px 0; }
    .dt-search {
      display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 38px;
      border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); max-width: 320px;
    }
    .dt-search svg { color: var(--text-tertiary); flex-shrink: 0; }
    .dt-search__input { flex: 1; border: none; background: transparent; outline: none; font-size: 14px; color: var(--text-primary); font-family: var(--font-body); }
    .dt-search__input::placeholder { color: var(--text-tertiary); }
    .dt-container { overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); }
    .dt-table { width: 100%; border-collapse: collapse; }
    .dt-thead { position: sticky; top: 0; z-index: 2; }
    .dt-th {
      padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .05em; color: var(--text-tertiary); background: var(--bg-muted);
      border-bottom: 1px solid var(--border-default); white-space: nowrap; user-select: none;
    }
    .dt-th--sortable { cursor: pointer; }
    .dt-th--sortable:hover { color: var(--text-primary); }
    .dt-sort-icon { margin-left: 4px; font-size: 12px; }
    .dt-td { padding: 12px 16px; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--border-default); vertical-align: middle; }
    .dt-tr--alt { background: var(--bg-subtle); }
    .dt-tr--selected { background: var(--hul-primary-light) !important; }
    .dt-tr:hover { background: var(--bg-muted); }
    .dt-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; white-space: nowrap; width: auto; max-width: 100%; }
    .dt-badge--primary { background: var(--hul-primary-light); color: var(--hul-primary); }
    .dt-badge--success { background: #ecfdf5; color: #059669; }
    .dt-badge--danger { background: #fef2f2; color: #ef4444; }
    .dt-badge--warning { background: #fffbeb; color: #d97706; }
    .dt-badge--info { background: #eff6ff; color: #2563eb; }
    .dt-badge--default { background: var(--bg-muted); color: var(--text-secondary); }
    :host-context(.dark) .dt-badge--success { background: rgba(5,150,105,.15); }
    :host-context(.dark) .dt-badge--danger { background: rgba(239,68,68,.15); }
    :host-context(.dark) .dt-badge--warning { background: rgba(217,119,6,.15); }
    :host-context(.dark) .dt-badge--info { background: rgba(37,99,235,.15); }
    .dt-currency { font-family: var(--font-display); font-weight: 600; }
    .dt-bool-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .dt-bool-badge--true { background: #ecfdf5; color: #059669; }
    .dt-bool-badge--false { background: #f8fafc; color: #64748b; }
    :host-context(.dark) .dt-bool-badge--true { background: rgba(5,150,105,.15); }
    :host-context(.dark) .dt-bool-badge--false { background: rgba(100,116,139,.18); }
    .dt-actions { display: flex; gap: 6px; flex-wrap: nowrap; white-space: nowrap; }
    .dt-action-btn {
      padding: 5px 12px; border-radius: var(--radius-md); font-size: 12px; font-weight: 500;
      cursor: pointer; border: 1px solid var(--border-default); background: var(--bg-card);
      color: var(--text-secondary); transition: all var(--duration-fast);
    }
    .dt-action-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .dt-action-btn--danger { color: var(--hul-danger); border-color: var(--hul-danger); }
    .dt-action-btn--danger:hover { background: var(--hul-danger); color: white; }
    .dt-action-btn--primary { color: var(--hul-primary); border-color: var(--hul-primary); }
    .dt-action-btn--primary:hover { background: var(--hul-primary); color: white; }
    .dt-empty { text-align: center; padding: 48px 16px; color: var(--text-tertiary); font-size: 14px; }
    .dt-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
    .dt-pagination__info { font-size: 13px; color: var(--text-tertiary); }
    .dt-pagination__controls { display: flex; gap: 4px; }
    .dt-page-btn {
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card);
      color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500;
      transition: all var(--duration-fast);
    }
    .dt-page-btn:hover:not(:disabled) { background: var(--bg-muted); color: var(--text-primary); }
    .dt-page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .dt-page-btn--active { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }
  `]
})
export class HulDataTableComponent implements OnInit, OnDestroy {
  @Input() columns: DataTableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading = false;
  @Input() totalCount = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() searchPlaceholder = '';
  @Input() emptyMessage = 'No data found';
  @Input() selectable = false;
  @Input() actions: DataTableAction[] = [];

  @Output() pageChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();
  @Output() rowAction = new EventEmitter<{ action: string; row: any }>();
  @Output() selectionChange = new EventEmitter<any[]>();

  selectedRows: any[] = [];
  sortColumn = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  private searchSubject = new Subject<string>();
  private sub!: Subscription;

  get totalPages(): number { return Math.ceil(this.totalCount / this.pageSize); }
  get allSelected(): boolean { return this.data.length > 0 && this.selectedRows.length === this.data.length; }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  ngOnInit(): void {
    this.sub = this.searchSubject.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(val => this.searchChange.emit(val));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onSearchInput(e: Event): void { this.searchSubject.next((e.target as HTMLInputElement).value); }

  toggleSort(col: string): void {
    if (this.sortColumn === col) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? '' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
    if (this.sortDirection) this.sortChange.emit({ column: this.sortColumn, direction: this.sortDirection as 'asc' | 'desc' });
  }

  toggleAll(e: Event): void {
    this.selectedRows = (e.target as HTMLInputElement).checked ? [...this.data] : [];
    this.selectionChange.emit(this.selectedRows);
  }

  toggleRow(row: any): void {
    const idx = this.selectedRows.indexOf(row);
    idx >= 0 ? this.selectedRows.splice(idx, 1) : this.selectedRows.push(row);
    this.selectionChange.emit([...this.selectedRows]);
  }

  isSelected(row: any): boolean { return this.selectedRows.includes(row); }
  clearSelection(): void { this.selectedRows = []; this.selectionChange.emit([]); }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.pageChange.emit(p); }
  }

  getBadgeVariant(col: DataTableColumn, val: string): string {
    return col.badgeMap?.[val] || 'default';
  }

  getRowActions(row: any): DataTableAction[] {
    return this.actions.filter(a => !a.condition || a.condition(row));
  }

  onRowAction(action: string, row: any): void { this.rowAction.emit({ action, row }); }
  onBulkAction(action: string): void { this.rowAction.emit({ action, row: this.selectedRows }); }

  formatNumber(val: number): string {
    if (val == null) return '0';
    return val.toLocaleString('en-IN');
  }

  getBooleanLabel(col: DataTableColumn, row: any): string {
    const value = !!row[col.key];
    const key = (col.key || '').toLowerCase();
    const label = (col.label || '').toLowerCase();
    if (key.includes('active') || label.includes('active') || key.includes('status')) {
      return value ? 'Active' : 'Inactive';
    }
    return value ? 'Yes' : 'No';
  }

  min(a: number, b: number): number { return Math.min(a, b); }
}
