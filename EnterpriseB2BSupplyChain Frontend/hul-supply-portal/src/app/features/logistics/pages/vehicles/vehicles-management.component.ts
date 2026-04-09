import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-vehicles-management', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Fleet Management" subtitle="Manage delivery vehicles, status and availability">
        <div page-actions class="header-actions">
          <button class="btn btn--primary" (click)="showForm = !showForm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ showForm ? 'Close' : 'Add Vehicle' }}
          </button>
        </div>
      </hul-page-header>

      <!-- Stats Strip -->
      <div class="stats-strip">
        <div class="stats-chip stats-chip--green">
          <span class="stats-chip__dot stats-chip__dot--green"></span>
          <span class="stats-chip__count">{{ availableCount }}</span>
          <span class="stats-chip__label">Available</span>
        </div>
        <div class="stats-chip stats-chip--amber">
          <span class="stats-chip__dot stats-chip__dot--amber"></span>
          <span class="stats-chip__count">{{ inUseCount }}</span>
          <span class="stats-chip__label">In Use</span>
        </div>
        <div class="stats-chip stats-chip--red">
          <span class="stats-chip__dot stats-chip__dot--red"></span>
          <span class="stats-chip__count">{{ maintenanceCount }}</span>
          <span class="stats-chip__label">Maintenance</span>
        </div>
        <div class="stats-chip stats-chip--blue">
          <span class="stats-chip__count">{{ vehicles.length }}</span>
          <span class="stats-chip__label">Total Fleet</span>
        </div>
      </div>

      <!-- Create Vehicle Form -->
      <div *ngIf="showForm" class="create-card">
        <div class="create-card__header">
          <h3>Register New Vehicle</h3>
          <button class="icon-btn" (click)="showForm = false" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="fg">
            <label>Registration No <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.registrationNo" class="fi" placeholder="e.g. MH 12 AB 1234" style="text-transform:uppercase" />
          </div>
          <div class="fg">
            <label>Vehicle Type <span class="req">*</span></label>
            <select [(ngModel)]="form.vehicleType" class="fi">
              <option value="">Select type...</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Tempo">Tempo</option>
              <option value="Bike">Bike</option>
              <option value="Mini Truck">Mini Truck</option>
              <option value="Container">Container</option>
            </select>
          </div>
          <div class="fg">
            <label>Capacity (kg)</label>
            <input type="number" [(ngModel)]="form.capacityKg" class="fi" placeholder="e.g. 1500" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" (click)="showForm = false">Cancel</button>
          <button class="btn btn--primary" [disabled]="!canCreate()" (click)="createVehicle()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Register Vehicle
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-bar">
        <button class="filter-tab" [class.filter-tab--active]="activeFilter === 'all'" (click)="activeFilter = 'all'">
          All <span class="tab-count">{{ vehicles.length }}</span>
        </button>
        <button class="filter-tab" [class.filter-tab--active]="activeFilter === 'Available'" (click)="activeFilter = 'Available'">
          Available <span class="tab-count tab-count--green">{{ availableCount }}</span>
        </button>
        <button class="filter-tab" [class.filter-tab--active]="activeFilter === 'InUse'" (click)="activeFilter = 'InUse'">
          In Use <span class="tab-count tab-count--amber">{{ inUseCount }}</span>
        </button>
        <button class="filter-tab" [class.filter-tab--active]="activeFilter === 'Maintenance'" (click)="activeFilter = 'Maintenance'">
          Maintenance <span class="tab-count tab-count--red">{{ maintenanceCount }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-grid">
        <div *ngFor="let i of [1,2,3]" class="skeleton-card"></div>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && filteredVehicles.length === 0" class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <p>{{ activeFilter === 'all' ? 'No vehicles registered yet.' : 'No vehicles with status: ' + activeFilter }}</p>
      </div>

      <!-- Vehicles grouped by type -->
      <div *ngIf="!loading && filteredVehicles.length > 0" class="vehicles-grid">
        <div *ngFor="let group of groupedVehicles" class="type-group">
          <div class="type-group__header">
            <span class="type-group__icon">
              <svg *ngIf="group.type === 'Truck' || group.type === 'Mini Truck'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <svg *ngIf="group.type === 'Van' || group.type === 'Tempo'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
              <svg *ngIf="group.type === 'Bike'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="m15 6-5 9h6l3 6"/><path d="M5.5 17.5 9 8h3"/></svg>
              <svg *ngIf="group.type === 'Container'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </span>
            <span class="type-group__name">{{ group.type }}</span>
            <span class="type-group__count">{{ group.vehicles.length }} vehicle{{ group.vehicles.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="vehicle-cards">
            <div *ngFor="let v of group.vehicles" class="vehicle-card"
                 [class.vehicle-card--available]="v.status === 'Available'"
                 [class.vehicle-card--inuse]="v.status === 'InUse'"
                 [class.vehicle-card--maintenance]="v.status === 'Maintenance'">
              <div class="vc-top">
                <span class="vc-reg">{{ v.registrationNo }}</span>
                <span class="vc-status" [ngClass]="'vc-status--' + v.status?.toLowerCase()">
                  <span class="vc-status__dot"></span>
                  {{ v.status === 'InUse' ? 'In Use' : v.status }}
                </span>
              </div>
              <div class="vc-meta">
                <div class="vc-meta__item" *ngIf="v.capacityKg">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  {{ v.capacityKg }} kg
                </div>
                <div class="vc-meta__item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  {{ v.vehicleType }}
                </div>
              </div>
              <div *ngIf="v.assignedAgentId" class="vc-agent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Assigned to agent
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Stats Strip */
    .stats-strip { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .stats-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 18px; border-radius: var(--radius-lg);
      background: var(--bg-card); border: 1px solid var(--border-default);
      box-shadow: var(--shadow-card);
    }
    .stats-chip__dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .stats-chip__dot--green { background: #10b981; }
    .stats-chip__dot--amber { background: #f59e0b; }
    .stats-chip__dot--red { background: #ef4444; }
    .stats-chip__count { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text-primary); }
    .stats-chip__label { font-size: 13px; color: var(--text-tertiary); font-weight: 500; }

    /* Header Actions */
    .header-actions { display: flex; gap: 8px; }

    /* Create Card */
    .create-card {
      background: var(--bg-card); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card); padding: 24px; margin-bottom: 20px;
      border: 1px solid var(--border-default);
      animation: slideDown 200ms ease;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
    .create-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .create-card__header h3 { font-size: 17px; font-weight: 700; margin: 0; color: var(--text-primary); font-family: var(--font-display); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 6px; border-radius: var(--radius-md); }
    .icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    .fg label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .req { color: var(--hul-danger); }
    .fi {
      width: 100%; padding: 10px 14px; border: 1px solid var(--border-default);
      border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary);
      font-size: 14px; font-family: var(--font-body); box-sizing: border-box;
    }
    .fi:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 22px; border-radius: var(--radius-lg); font-size: 14px;
      font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body);
      transition: all var(--duration-fast);
    }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); color: var(--text-primary); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Filter Tabs */
    .filter-bar { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border-default); padding-bottom: 0; }
    .filter-tab {
      padding: 10px 18px; background: none; border: none; border-bottom: 3px solid transparent;
      font-size: 14px; font-weight: 600; color: var(--text-tertiary); cursor: pointer;
      font-family: var(--font-body); display: flex; align-items: center; gap: 6px;
      margin-bottom: -1px; transition: all var(--duration-fast);
    }
    .filter-tab:hover { color: var(--text-primary); }
    .filter-tab--active { color: var(--hul-primary); border-bottom-color: var(--hul-primary); }
    .tab-count { padding: 1px 7px; border-radius: 9999px; font-size: 11px; background: var(--bg-muted); color: var(--text-tertiary); }
    .tab-count--green { background: rgba(16,185,129,.1); color: #059669; }
    .tab-count--amber { background: rgba(245,158,11,.1); color: #d97706; }
    .tab-count--red { background: rgba(239,68,68,.1); color: #dc2626; }

    /* Loading */
    .loading-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .skeleton-card { height: 120px; border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border-default); animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    /* Empty */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px 20px; text-align: center; }
    .empty-state p { font-size: 15px; font-weight: 500; color: var(--text-tertiary); margin: 0; }

    /* Type Group */
    .vehicles-grid { display: flex; flex-direction: column; gap: 28px; }
    .type-group__header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border-default);
    }
    .type-group__icon {
      width: 32px; height: 32px; border-radius: var(--radius-md);
      background: var(--bg-muted); display: flex; align-items: center; justify-content: center;
      color: var(--text-secondary); flex-shrink: 0;
    }
    .type-group__name { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .type-group__count { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-left: auto; }

    /* Vehicle Cards Grid */
    .vehicle-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

    .vehicle-card {
      background: var(--bg-card); border-radius: var(--radius-lg);
      border: 1px solid var(--border-default); border-left: 4px solid var(--border-default);
      padding: 16px 20px; transition: all var(--duration-fast);
      box-shadow: var(--shadow-card);
    }
    .vehicle-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .vehicle-card--available { border-left-color: #10b981; }
    .vehicle-card--inuse { border-left-color: #f59e0b; }
    .vehicle-card--maintenance { border-left-color: #ef4444; }

    .vc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .vc-reg {
      font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text-primary);
      letter-spacing: .03em;
    }
    .vc-status {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .03em;
    }
    .vc-status__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .vc-status--available { background: #d1fae5; color: #065f46; }
    .vc-status--available .vc-status__dot { background: #10b981; }
    .vc-status--inuse { background: #fef3c7; color: #92400e; }
    .vc-status--inuse .vc-status__dot { background: #f59e0b; }
    .vc-status--maintenance { background: #fee2e2; color: #991b1b; }
    .vc-status--maintenance .vc-status__dot { background: #ef4444; }
    :host-context(.dark) .vc-status--available { background: rgba(16,185,129,.15); color: #6ee7b7; }
    :host-context(.dark) .vc-status--inuse { background: rgba(245,158,11,.15); color: #fcd34d; }
    :host-context(.dark) .vc-status--maintenance { background: rgba(239,68,68,.15); color: #fca5a5; }

    .vc-meta { display: flex; gap: 16px; }
    .vc-meta__item {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--text-secondary);
    }

    .vc-agent {
      display: inline-flex; align-items: center; gap: 5px;
      margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-default);
      font-size: 12px; color: var(--text-tertiary); font-weight: 500;
    }

    @media (max-width: 600px) { .vehicle-cards { grid-template-columns: 1fr; } }
  `]
})
export class VehiclesManagementComponent implements OnInit {
  loading = true;
  vehicles: any[] = [];
  showForm = false;
  activeFilter: 'all' | 'Available' | 'InUse' | 'Maintenance' = 'all';
  form = { registrationNo: '', vehicleType: '', capacityKg: null as number | null };

  get availableCount() { return this.vehicles.filter(v => v.status === 'Available').length; }
  get inUseCount() { return this.vehicles.filter(v => v.status === 'InUse').length; }
  get maintenanceCount() { return this.vehicles.filter(v => v.status === 'Maintenance').length; }

  get filteredVehicles() {
    if (this.activeFilter === 'all') return this.vehicles;
    return this.vehicles.filter(v => v.status === this.activeFilter);
  }

  get groupedVehicles(): { type: string; vehicles: any[] }[] {
    const types = [...new Set(this.filteredVehicles.map(v => v.vehicleType || 'Other'))];
    return types.sort().map(type => ({
      type,
      vehicles: this.filteredVehicles.filter(v => (v.vehicleType || 'Other') === type)
    }));
  }

  constructor(private http: ZoneHttpService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }

  canCreate(): boolean {
    return !!this.form.registrationNo.trim() && !!this.form.vehicleType;
  }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.logistics.vehicles()).subscribe({
      next: v => { this.vehicles = v; this.loading = false; },
      error: () => this.loading = false
    });
  }

  createVehicle(): void {
    this.http.post(API_ENDPOINTS.logistics.vehicles(), {
      ...this.form,
      registrationNo: this.form.registrationNo.toUpperCase().trim()
    }).subscribe({
      next: () => {
        this.toast.success('Vehicle registered successfully');
        this.showForm = false;
        this.form = { registrationNo: '', vehicleType: '', capacityKg: null };
        this.load();
      },
      error: err => this.toast.error(err.error?.error || 'Failed to register vehicle')
    });
  }
}
