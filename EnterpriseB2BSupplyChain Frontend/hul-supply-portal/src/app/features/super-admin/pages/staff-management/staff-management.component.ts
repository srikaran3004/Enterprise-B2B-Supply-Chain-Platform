import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn } from '../../../../shared/ui/data-table/hul-data-table.component';

// State abbreviation → display name lookup (mirrors IdentitySeeder email suffixes)
const STATE_MAP: Record<string, string> = {
  br: 'Bihar', mh: 'Maharashtra', ka: 'Karnataka', tn: 'Tamil Nadu',
  up: 'Uttar Pradesh', gj: 'Gujarat', wb: 'West Bengal', rj: 'Rajasthan',
  dl: 'Delhi', ts: 'Telangana', kl: 'Kerala', pb: 'Punjab',
  mp: 'Madhya Pradesh', ap: 'Andhra Pradesh', od: 'Odisha', hr: 'Haryana',
  jh: 'Jharkhand', cg: 'Chhattisgarh', as: 'Assam', uk: 'Uttarakhand',
  hp: 'Himachal Pradesh', ga: 'Goa',
};

function stateFromEmail(email: string): string {
  // Emails seeded as: name.surname.XX@unidistrib.com  where XX is state code
  const match = email.match(/\.([a-z]{2})@/);
  if (match) {
    const code = match[1];
    return STATE_MAP[code] ?? '';
  }
  return '';
}

@Component({
  selector: 'app-staff-management', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Staff Management" subtitle="Create and manage admin and delivery agent accounts"></hul-page-header>

      <!-- Create Form Toggle -->
      <div class="create-section" [class.create-section--visible]="showForm">
        <button *ngIf="!showForm" class="btn-create" (click)="showForm = true">+ Create Staff Account</button>
        <div *ngIf="showForm" class="create-form">
          <h3>New Staff Account</h3>
          <div class="form-grid">
            <div class="fg"><label>Full Name *</label><input type="text" [(ngModel)]="form.fullName" class="fi" placeholder="John Doe" /></div>
            <div class="fg"><label>Email *</label><input type="email" [(ngModel)]="form.email" class="fi" placeholder="john@unidistrib.com" /></div>
            <div class="fg"><label>Password *</label><input type="password" [(ngModel)]="form.password" class="fi" placeholder="Min 8 characters" /></div>
            <div class="fg"><label>Phone Number</label><input type="text" [(ngModel)]="form.phoneNumber" class="fi" placeholder="+91 98765 43210" /></div>
            <div class="fg">
              <label>Role *</label>
              <select [(ngModel)]="form.role" class="fi">
                <option value="">Select role</option>
                <option value="Admin">Admin</option>
                <option value="DeliveryAgent">Delivery Agent</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showForm = false">Cancel</button>
            <button class="btn btn--primary" [disabled]="!canSubmit()" (click)="createStaff()">Create Account</button>
          </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filters-row">
        <!-- Role Tabs -->
        <div class="role-tabs">
          <button class="role-tab" [class.role-tab--active]="roleFilter === 'all'" (click)="setRoleFilter('all')">
            All <span class="tab-count">{{ allStaff.length }}</span>
          </button>
          <button class="role-tab" [class.role-tab--active]="roleFilter === 'Admin'" (click)="setRoleFilter('Admin')">
            Admins <span class="tab-count">{{ countByRole('Admin') }}</span>
          </button>
          <button class="role-tab" [class.role-tab--active]="roleFilter === 'DeliveryAgent'" (click)="setRoleFilter('DeliveryAgent')">
            Delivery Agents <span class="tab-count">{{ countByRole('DeliveryAgent') }}</span>
          </button>
        </div>

        <!-- State filter (visible only for DeliveryAgent tab) -->
        <div class="state-filter" *ngIf="roleFilter === 'DeliveryAgent'">
          <label class="state-label">State:</label>
          <select [(ngModel)]="stateFilter" (ngModelChange)="onFilterChange()" class="state-select">
            <option value="">All States</option>
            <option *ngFor="let s of availableStates" [value]="s">{{ s }}</option>
          </select>
        </div>

        <!-- Page size selector -->
        <div class="pagesize-selector">
          <label>Show:</label>
          <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()" class="pagesize-select">
            <option [value]="5">5</option>
            <option [value]="10">10</option>
            <option [value]="50">50</option>
            <option [value]="100">100</option>
          </select>
          <span>per page</span>
        </div>
      </div>

      <!-- Data Table -->
      <hul-data-table
        [columns]="activeColumns"
        [data]="pagedRows"
        [loading]="loading"
        [totalCount]="filteredStaff.length"
        [currentPage]="currentPage"
        [pageSize]="pageSizeNum"
        emptyMessage="No staff accounts found."
        (pageChange)="onPageChange($event)">
      </hul-data-table>
    </div>
  `,
  styles: [`
    .create-section { margin-bottom: 20px; }
    .btn-create { padding: 10px 20px; border-radius: var(--radius-lg); border: none; background: var(--hul-primary); color: white; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .create-form { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 24px; }
    .create-form h3 { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: var(--text-primary); font-family: var(--font-display); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    .fg label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .fi { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body); box-sizing: border-box; }
    .fi:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Filters row */
    .filters-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .role-tabs { display: flex; gap: 4px; background: var(--bg-muted); border-radius: var(--radius-lg); padding: 4px; }
    .role-tab { padding: 7px 16px; border: none; background: transparent; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all var(--duration-fast); }
    .role-tab--active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm); font-weight: 600; }
    .tab-count { background: var(--bg-subtle); color: var(--text-tertiary); border-radius: 9999px; font-size: 11px; font-weight: 700; padding: 1px 7px; }
    .role-tab--active .tab-count { background: var(--hul-primary-light); color: var(--hul-primary); }

    .state-filter { display: flex; align-items: center; gap: 8px; }
    .state-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; white-space: nowrap; }
    .state-select { padding: 7px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body); outline: none; cursor: pointer; min-width: 150px; }
    .state-select:focus { border-color: var(--border-focus); }

    .pagesize-selector { display: flex; align-items: center; gap: 8px; margin-left: auto; font-size: 13px; color: var(--text-secondary); }
    .pagesize-select { padding: 7px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body); outline: none; cursor: pointer; }
    .pagesize-select:focus { border-color: var(--border-focus); }
  `]
})
export class StaffManagementComponent implements OnInit {
  loading = true;
  allStaff: any[] = [];
  showForm = false;
  form = { fullName: '', email: '', password: '', phoneNumber: '', role: '' };

  // Filters
  roleFilter: 'all' | 'Admin' | 'DeliveryAgent' = 'all';
  stateFilter = '';

  // Pagination
  currentPage = 1;
  pageSize = 5;

  // Columns for each role view
  adminColumns: DataTableColumn[] = [
    { key: 'fullName', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phoneNumber', label: 'Phone', type: 'text' },
    { key: 'role', label: 'Role', type: 'badge', badgeMap: { 'Admin': 'info', 'SuperAdmin': 'primary' } },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Active': 'success', 'Suspended': 'danger', 'Pending': 'warning' } },
    { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
  ];

  agentColumns: DataTableColumn[] = [
    { key: 'fullName', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phoneNumber', label: 'Phone', type: 'text' },
    { key: 'state', label: 'State', type: 'text', sortable: true },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Active': 'success', 'Suspended': 'danger', 'Pending': 'warning' } },
    { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
  ];

  allColumns: DataTableColumn[] = [
    { key: 'fullName', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phoneNumber', label: 'Phone', type: 'text' },
    { key: 'role', label: 'Role', type: 'badge', badgeMap: { 'Admin': 'info', 'SuperAdmin': 'primary', 'DeliveryAgent': 'warning' } },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Active': 'success', 'Suspended': 'danger', 'Pending': 'warning' } },
    { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
  ];

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.superAdmin.viewAdmins()).subscribe({
      next: list => {
        // Enrich delivery agents with state info derived from email
        this.allStaff = (list || []).map(u => ({
          ...u,
          state: u.role === 'DeliveryAgent' ? stateFromEmail(u.email) : ''
        }));
        this.loading = false;
        this.applyFilters();
      },
      error: () => this.loading = false
    });
  }

  // ─── Computed ───────────────────────────────────────────────────────────────

  get activeColumns(): DataTableColumn[] {
    if (this.roleFilter === 'Admin') return this.adminColumns;
    if (this.roleFilter === 'DeliveryAgent') return this.agentColumns;
    return this.allColumns;
  }

  get filteredStaff(): any[] {
    let list = this.allStaff;
    if (this.roleFilter !== 'all') list = list.filter(u => u.role === this.roleFilter);
    if (this.roleFilter === 'DeliveryAgent' && this.stateFilter) {
      list = list.filter(u => u.state === this.stateFilter);
    }
    return list;
  }

  get pagedRows(): any[] {
    const size = +this.pageSize; // coerce to number — select option values arrive as strings
    const start = (this.currentPage - 1) * size;
    return this.filteredStaff.slice(start, start + size);
  }

  get pageSizeNum(): number { return +this.pageSize; }

  get availableStates(): string[] {
    const agents = this.allStaff.filter(u => u.role === 'DeliveryAgent');
    const stateSet = new Set<string>(agents.map(u => u.state).filter(Boolean));
    return Array.from(stateSet).sort();
  }

  countByRole(role: string): number {
    return this.allStaff.filter(u => u.role === role).length;
  }

  // ─── Event handlers ─────────────────────────────────────────────────────────

  setRoleFilter(f: 'all' | 'Admin' | 'DeliveryAgent'): void {
    this.roleFilter = f;
    this.stateFilter = '';
    this.currentPage = 1;
  }

  onFilterChange(): void { this.currentPage = 1; }

  onPageChange(p: number): void { this.currentPage = p; }

  onPageSizeChange(): void { this.currentPage = 1; }

  applyFilters(): void { this.currentPage = 1; }

  // ─── Create form ─────────────────────────────────────────────────────────────

  canSubmit(): boolean { return !!(this.form.fullName?.trim() && this.form.email?.trim() && this.form.password?.length >= 8 && this.form.role); }

  createStaff(): void {
    this.http.post(API_ENDPOINTS.superAdmin.createAdmin(), this.form).subscribe({
      next: () => {
        this.toast.success(`${this.form.role} account created for ${this.form.fullName}`);
        this.showForm = false;
        this.form = { fullName: '', email: '', password: '', phoneNumber: '', role: '' };
        this.load();
      },
      error: err => this.toast.error(err.error?.error || 'Failed to create account')
    });
  }
}
