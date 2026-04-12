import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-agents-management', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Delivery Agents" subtitle="Manage agents, regions and performance">
        <div page-actions class="header-actions">
          <button class="btn btn--primary" (click)="showForm = !showForm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            {{ showForm ? 'Close' : 'Create Agent' }}
          </button>
        </div>
      </hul-page-header>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-chip stat-chip--total">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <div>
            <div class="stat-chip__value">{{ allAgents.length }}</div>
            <div class="stat-chip__label">Total Agents</div>
          </div>
        </div>
        <div class="stat-chip stat-chip--avail">
          <span class="status-indicator status-indicator--green"></span>
          <div>
            <div class="stat-chip__value">{{ availableCount }}</div>
            <div class="stat-chip__label">Available</div>
          </div>
        </div>
        <div class="stat-chip stat-chip--assigned">
          <span class="status-indicator status-indicator--amber"></span>
          <div>
            <div class="stat-chip__value">{{ assignedCount }}</div>
            <div class="stat-chip__label">On Delivery</div>
          </div>
        </div>
        <div class="stat-chip stat-chip--offduty">
          <span class="status-indicator status-indicator--gray"></span>
          <div>
            <div class="stat-chip__value">{{ offDutyCount }}</div>
            <div class="stat-chip__label">Off Duty</div>
          </div>
        </div>
      </div>

      <!-- Create Form -->
      <div *ngIf="showForm" class="create-card">
        <div class="create-card__header">
          <h3>Register New Delivery Agent</h3>
          <button class="icon-btn" (click)="showForm = false" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="fg"><label>Full Name <span class="req">*</span></label><input type="text" [(ngModel)]="form.fullName" class="fi" placeholder="Enter full name" /></div>
          <div class="fg"><label>Phone <span class="req">*</span></label><input type="text" [(ngModel)]="form.phone" class="fi" placeholder="e.g. +91 98765 43210" /></div>
          <div class="fg"><label>Service Region (State) <span class="req">*</span></label><input type="text" [(ngModel)]="form.serviceRegion" class="fi" placeholder="e.g. Maharashtra, Gujarat" /></div>
          <div class="fg"><label>License Number</label><input type="text" [(ngModel)]="form.licenseNumber" class="fi" placeholder="Optional" /></div>
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" (click)="showForm = false">Cancel</button>
          <button class="btn btn--primary" [disabled]="!canCreate()" (click)="createAgent()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Register Agent
          </button>
        </div>
      </div>

      <!-- Region Filter Dropdown + Status Tabs -->
      <div class="filter-bar">
        <div class="filter-bar__left">
          <select class="region-select" [(ngModel)]="selectedRegion" (ngModelChange)="applyFilters()">
            <option value="">All Regions</option>
            <option *ngFor="let r of regions" [value]="r">{{ r }}</option>
          </select>
          <div class="status-tabs">
            <button class="status-tab" [class.status-tab--active]="statusFilter === ''" (click)="statusFilter = ''; applyFilters()">All</button>
            <button class="status-tab" [class.status-tab--active]="statusFilter === 'Available'" (click)="statusFilter = 'Available'; applyFilters()">Available</button>
            <button class="status-tab" [class.status-tab--active]="statusFilter === 'Assigned'" (click)="statusFilter = 'Assigned'; applyFilters()">On Delivery</button>
            <button class="status-tab" [class.status-tab--active]="statusFilter === 'OffDuty'" (click)="statusFilter = 'OffDuty'; applyFilters()">Off Duty</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-grid">
        <div *ngFor="let i of [1,2,3,4]" class="skeleton-card"></div>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && filteredAgents.length === 0" class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        <p>No agents found. {{ selectedRegion ? 'Try a different region.' : 'Create your first agent above.' }}</p>
      </div>

      <!-- Agent Cards grouped by Region -->
      <div *ngIf="!loading && filteredAgents.length > 0" class="agents-grid">
        <div *ngFor="let group of groupedAgents" class="region-group">
          <div class="region-group__header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="region-group__name">{{ group.region }}</span>
            <span class="region-group__count">{{ group.agents.length }} agent{{ group.agents.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="agent-cards">
            <div *ngFor="let a of group.agents" class="agent-card"
                 [class.agent-card--available]="a.status === 'Available'"
                 [class.agent-card--assigned]="a.status === 'Assigned'"
                 [class.agent-card--offduty]="a.status === 'OffDuty'">
              <div class="ac-top">
                <hul-avatar [name]="a.fullName" size="sm"></hul-avatar>
                <div class="ac-info">
                  <div class="ac-name">{{ a.fullName }}</div>
                  <div class="ac-phone">{{ a.phone }}</div>
                </div>
                <span class="ac-status" [ngClass]="'ac-status--' + a.status?.toLowerCase()">
                  <span class="ac-status__dot"></span>
                  {{ getStatusLabel(a.status) }}
                </span>
              </div>
              <div class="ac-details">
                <div class="ac-detail">
                  <span class="ac-detail__label">Rating</span>
                  <span class="ac-detail__value" [class.ac-detail__value--star]="a.averageRating > 0">
                    {{ a.averageRating > 0 ? a.averageRating.toFixed(1) : 'New' }}
                    <span *ngIf="a.averageRating > 0" class="star">&#9733;</span>
                  </span>
                </div>
                <div class="ac-detail">
                  <span class="ac-detail__label">Deliveries</span>
                  <span class="ac-detail__value">{{ a.totalDeliveries || 0 }}</span>
                </div>
                <div class="ac-detail" *ngIf="a.licenseNumber">
                  <span class="ac-detail__label">License</span>
                  <span class="ac-detail__value ac-detail__value--mono">{{ a.licenseNumber }}</span>
                </div>
              </div>
              <div *ngIf="a.currentOrderId && a.status === 'Assigned'" class="ac-order">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Order: {{ a.currentOrderId.toString().substring(0, 8).toUpperCase() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 8px; }
    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    .stat-chip {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 20px; background: var(--bg-card); border-radius: var(--radius-lg);
      border: 1px solid var(--border-default); box-shadow: var(--shadow-card);
    }
    .stat-chip svg { color: var(--hul-primary); flex-shrink: 0; }
    .stat-chip__value { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-chip__label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-top: 2px; }
    .status-indicator { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .status-indicator--green { background: #10b981; }
    .status-indicator--amber { background: #f59e0b; }
    .status-indicator--gray { background: #9ca3af; }

    /* Create card */
    .create-card {
      background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
      padding: 24px; margin-bottom: 20px; border: 1px solid var(--border-default);
      animation: slideDown 200ms ease;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
    .create-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .create-card__header h3 { font-size: 17px; font-weight: 700; margin: 0; color: var(--text-primary); font-family: var(--font-display); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 6px; border-radius: var(--radius-md); }
    .icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    .fg label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .req { color: var(--hul-danger); }
    .fi { width: 100%; padding: 10px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body); box-sizing: border-box; }
    .fi:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .fi::placeholder { color: var(--text-disabled); }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all var(--duration-fast); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); color: var(--text-primary); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Filter Bar */
    .filter-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-bar__left { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
    .region-select {
      padding: 9px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-card); color: var(--text-primary); font-size: 14px; font-family: var(--font-body);
      cursor: pointer; min-width: 180px;
    }
    .region-select:focus { outline: none; border-color: var(--hul-primary); }
    .status-tabs { display: flex; gap: 4px; }
    .status-tab {
      padding: 7px 14px; border: 1px solid var(--border-default); border-radius: 9999px;
      background: var(--bg-card); color: var(--text-tertiary); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: var(--font-body); transition: all var(--duration-fast);
    }
    .status-tab:hover { border-color: var(--hul-primary); color: var(--hul-primary); }
    .status-tab--active { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }

    /* Loading/Empty */
    .loading-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 768px) { .loading-grid { grid-template-columns: 1fr; } }
    .skeleton-card { height: 140px; border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border-default); animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 20px; text-align: center; }
    .empty-state p { font-size: 15px; font-weight: 500; color: var(--text-tertiary); margin: 0; }

    /* Region Group */
    .agents-grid { display: flex; flex-direction: column; gap: 28px; }
    .region-group__header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border-default);
      color: var(--text-secondary);
    }
    .region-group__name { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .region-group__count { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-left: auto; }

    /* Agent Cards */
    .agent-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    @media (max-width: 600px) { .agent-cards { grid-template-columns: 1fr; } }

    .agent-card {
      background: var(--bg-card); border-radius: var(--radius-lg);
      border: 1px solid var(--border-default); border-left: 4px solid var(--border-default);
      padding: 18px 20px; transition: all var(--duration-fast);
      box-shadow: var(--shadow-card);
    }
    .agent-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .agent-card--available { border-left-color: #10b981; }
    .agent-card--assigned { border-left-color: #f59e0b; }
    .agent-card--offduty { border-left-color: #9ca3af; }

    .ac-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .ac-info { flex: 1; min-width: 0; }
    .ac-name { font-size: 15px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ac-phone { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
    .ac-status {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .03em; flex-shrink: 0;
    }
    .ac-status__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .ac-status--available { background: #d1fae5; color: #065f46; }
    .ac-status--available .ac-status__dot { background: #10b981; }
    .ac-status--assigned { background: #fef3c7; color: #92400e; }
    .ac-status--assigned .ac-status__dot { background: #f59e0b; }
    .ac-status--offduty { background: var(--bg-muted); color: var(--text-tertiary); }
    .ac-status--offduty .ac-status__dot { background: #9ca3af; }
    .ac-status--busy { background: #fee2e2; color: #991b1b; }
    .ac-status--busy .ac-status__dot { background: #ef4444; }
    :host-context(.dark) .ac-status--available { background: rgba(16,185,129,.15); color: #6ee7b7; }
    :host-context(.dark) .ac-status--assigned { background: rgba(245,158,11,.15); color: #fcd34d; }
    :host-context(.dark) .ac-status--busy { background: rgba(239,68,68,.15); color: #fca5a5; }

    .ac-details {
      display: flex; gap: 20px; padding: 10px 0;
      border-top: 1px solid var(--border-default);
    }
    .ac-detail { display: flex; flex-direction: column; gap: 2px; }
    .ac-detail__label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); }
    .ac-detail__value { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .ac-detail__value--star { color: #d97706; }
    .ac-detail__value--mono { font-family: var(--font-mono); font-size: 12px; font-weight: 600; }
    .star { color: #f59e0b; margin-left: 2px; }

    .ac-order {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 10px; padding: 6px 12px; border-radius: var(--radius-md);
      background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.2);
      font-size: 12px; font-weight: 600; color: #d97706;
      font-family: var(--font-mono);
    }
  `]
})
export class AgentsManagementComponent implements OnInit {
  loading = true;
  allAgents: any[] = [];
  filteredAgents: any[] = [];
  showForm = false;
  selectedRegion = '';
  statusFilter = '';
  form = { fullName: '', phone: '', licenseNumber: '', serviceRegion: '', userId: '' };

  get regions(): string[] {
    return [...new Set(this.allAgents.map(a => a.serviceRegion).filter(Boolean))].sort();
  }

  get availableCount() { return this.allAgents.filter(a => a.status === 'Available').length; }
  get assignedCount() { return this.allAgents.filter(a => a.status === 'Assigned').length; }
  get offDutyCount() { return this.allAgents.filter(a => a.status === 'OffDuty').length; }

  get groupedAgents(): { region: string; agents: any[] }[] {
    const regions = [...new Set(this.filteredAgents.map(a => a.serviceRegion || 'Unassigned'))];
    return regions.sort().map(region => ({
      region,
      agents: this.filteredAgents.filter(a => (a.serviceRegion || 'Unassigned') === region)
    }));
  }

  constructor(private http: ZoneHttpService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }

  canCreate(): boolean {
    return !!this.form.fullName.trim() && !!this.form.phone.trim() && !!this.form.serviceRegion.trim();
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { Available: 'Available', Assigned: 'On Delivery', OffDuty: 'Off Duty', Busy: 'Busy' };
    return map[status] || status;
  }

  applyFilters(): void {
    let result = [...this.allAgents];
    if (this.selectedRegion) {
      result = result.filter(a => a.serviceRegion === this.selectedRegion);
    }
    if (this.statusFilter) {
      result = result.filter(a => a.status === this.statusFilter);
    }
    this.filteredAgents = result;
  }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.agents()).subscribe({
      next: a => {
        this.allAgents = a;
        this.applyFilters();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  createAgent(): void {
    this.http.post(API_ENDPOINTS.logistics.agents(), this.form).subscribe({
      next: () => {
        this.toast.success('Agent registered successfully');
        this.showForm = false;
        this.form = { fullName: '', phone: '', licenseNumber: '', serviceRegion: '', userId: '' };
        this.load();
      },
      error: err => this.toast.error(err.error?.error || 'Failed to create agent')
    });
  }
}
