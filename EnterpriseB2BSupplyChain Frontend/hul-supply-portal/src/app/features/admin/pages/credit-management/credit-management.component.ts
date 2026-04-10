import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-credit-management', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Credit Management" subtitle="Manage dealer credit limits and utilization"></hul-page-header>
      <div class="kpi-grid">
        <hul-stat-card title="Total Credit Extended" [value]="'₹' + formatNum(totalCredit)" icon="credit-card" iconColor="blue" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Total Outstanding" [value]="'₹' + formatNum(totalOutstanding)" icon="trending-up" iconColor="amber" [loading]="loading"></hul-stat-card>
        <hul-stat-card title="Over 80% Utilization" [value]="highUtil" icon="alert-triangle" iconColor="red" [loading]="loading"></hul-stat-card>
      </div>
      <div style="margin-top:24px">
        <hul-data-table [columns]="columns" [data]="dealers" [loading]="loading" [totalCount]="dealers.length"
          [currentPage]="1" [pageSize]="50" searchPlaceholder="Search by dealer name..."
          emptyMessage="No credit data found" [actions]="tableActions"
          (searchChange)="onSearch($event)" (rowAction)="onAction($event)">
        </hul-data-table>
      </div>

      <!-- Adjust Credit Limit Modal -->
      <hul-modal *ngIf="showCreditModal" [open]="showCreditModal" title="Adjust Credit Limit" size="sm" (close)="closeModal()">
        <div class="credit-form" *ngIf="editDealer">
          <div class="dealer-info">
            <div class="dealer-avatar">{{ editDealer.fullName?.charAt(0)?.toUpperCase() }}</div>
            <div>
              <div class="dealer-name">{{ editDealer.fullName }}</div>
              <div class="dealer-biz">{{ editDealer.businessName }}</div>
            </div>
          </div>

          <div class="credit-stats-row">
            <div class="credit-stat-box">
              <span class="cstat-label">Current Limit</span>
              <span class="cstat-val">₹{{ formatNum(editDealer.creditLimit) }}</span>
            </div>
            <div class="credit-stat-box">
              <span class="cstat-label">Outstanding</span>
              <span class="cstat-val cstat-val--danger">₹{{ formatNum(editDealer.outstanding) }}</span>
            </div>
            <div class="credit-stat-box">
              <span class="cstat-label">Utilization</span>
              <span class="cstat-val">{{ editDealer.utilization }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">New Credit Limit <span class="req">*</span></label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">₹</span>
              <input type="number" [(ngModel)]="newCreditLimit" placeholder="0" min="0" step="1000" class="form-input form-input--prefixed" autofocus />
            </div>
            <p class="form-hint" *ngIf="newCreditLimit && newCreditLimit < editDealer.outstanding">
              Warning: New limit is less than outstanding balance (₹{{ formatNum(editDealer.outstanding) }})
            </p>
          </div>

          <div class="modal-footer-actions">
            <button class="btn btn--ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn--primary" [disabled]="!newCreditLimit || newCreditLimit < 0 || saving" (click)="saveCreditLimit()">
              <span *ngIf="saving" class="btn-spinner"></span>
              {{ saving ? 'Saving...' : 'Update Limit' }}
            </button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr; } }

    /* Credit Form inside modal */
    .credit-form { display: flex; flex-direction: column; gap: 20px; }
    .dealer-info { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-default); }
    .dealer-avatar { width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--hul-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; font-family: var(--font-display); flex-shrink: 0; }
    .dealer-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .dealer-biz { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

    .credit-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .credit-stat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-default); }
    .cstat-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
    .cstat-val { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
    .cstat-val--danger { color: var(--hul-danger); }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
    .req { color: var(--hul-danger); }
    .input-prefix-wrap { position: relative; display: flex; align-items: center; }
    .input-prefix { position: absolute; left: 12px; font-size: 14px; font-weight: 600; color: var(--text-tertiary); pointer-events: none; }
    .form-input {
      width: 100%; padding: 11px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-card); color: var(--text-primary); font-size: 15px; font-family: var(--font-mono);
      box-sizing: border-box; transition: border-color 150ms ease;
    }
    .form-input--prefixed { padding-left: 28px; }
    .form-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-hint { margin: 4px 0 0; font-size: 12px; color: var(--hul-warning); }

    .modal-footer-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all 150ms ease; display: inline-flex; align-items: center; gap: 6px; }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class CreditManagementComponent implements OnInit {
  loading = true;
  dealers: any[] = [];
  allDealers: any[] = [];
  totalCredit = 0;
  totalOutstanding = 0;
  highUtil = 0;

  showCreditModal = false;
  editDealer: any = null;
  newCreditLimit: number | null = null;
  saving = false;

  columns: DataTableColumn[] = [
    { key: 'fullName', label: 'Dealer', type: 'text', sortable: true },
    { key: 'businessName', label: 'Business', type: 'text' },
    { key: 'creditLimit', label: 'Credit Limit', type: 'currency-inr' },
    { key: 'outstanding', label: 'Outstanding', type: 'currency-inr' },
    { key: 'available', label: 'Available', type: 'currency-inr' },
    { key: 'utilization', label: 'Utilization %', type: 'text' },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];
  tableActions: DataTableAction[] = [{ key: 'adjust', label: 'Adjust Limit', variant: 'primary' }];

  constructor(private http: ZoneHttpService, private toast: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.admin.dealers() + '?status=Active').subscribe({
      next: dealers => {
        const requests = dealers.map(dealer =>
          this.http.get<any>(API_ENDPOINTS.payment.creditAccount(this.getDealerFinancialId(dealer))).pipe(
            map(account => {
              const creditLimit = account?.creditLimit ?? 500_000;
              const outstanding = account?.outstanding ?? 0;
              const available = account?.available ?? (creditLimit - outstanding);
              const utilization = creditLimit > 0 ? Math.round((outstanding / creditLimit) * 100) : 0;

              return {
                ...dealer,
                creditLimit,
                outstanding,
                available,
                utilization: `${utilization}%`
              };
            }),
            catchError(() => of({
              ...dealer,
              creditLimit: 500_000,
              outstanding: 0,
              available: 500_000,
              utilization: '0%'
            }))
          )
        );

        forkJoin(requests).subscribe({
          next: dealerRows => {
            this.allDealers = dealerRows;
            this.dealers = [...this.allDealers];
            this.totalCredit = this.allDealers.reduce((s, d) => s + (d.creditLimit || 0), 0);
            this.totalOutstanding = this.allDealers.reduce((s, d) => s + (d.outstanding || 0), 0);
            this.highUtil = this.allDealers.filter(d => {
              const utilization = Number(String(d.utilization || '0').replace('%', ''));
              return utilization > 80;
            }).length;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(term: string): void {
    const s = term.toLowerCase();
    this.dealers = s ? this.allDealers.filter(d => d.fullName?.toLowerCase().includes(s)) : [...this.allDealers];
  }

  onAction(e: any): void {
    if (e.action === 'adjust') {
      this.editDealer = e.row;
      this.newCreditLimit = e.row.creditLimit || 500000;
      this.showCreditModal = true;
    }
  }

  closeModal(): void {
    this.showCreditModal = false;
    this.editDealer = null;
    this.saving = false;
  }

  saveCreditLimit(): void {
    if (!this.newCreditLimit || this.newCreditLimit < 0 || !this.editDealer) return;

    this.saving = true;
    const dealerFinancialId = this.getDealerFinancialId(this.editDealer);
    // Backend expects { NewLimit: number } — capital N
    this.http.put(API_ENDPOINTS.payment.creditLimit(dealerFinancialId), { NewLimit: this.newCreditLimit }).subscribe({
      next: () => {
        this.toast.success(`Credit limit updated to ₹${this.newCreditLimit!.toLocaleString('en-IN')}`);
        this.saving = false;
        this.showCreditModal = false;
        this.editDealer = null;
        this.load(); // Re-fetch from DB to show updated values
      },
      error: err => {
        this.toast.error(err?.error?.error || 'Failed to update limit');
        this.saving = false;
      }
    });
  }

  formatNum(val: number): string { return val ? val.toLocaleString('en-IN') : '0'; }

  private getDealerFinancialId(dealer: any): string {
    return dealer?.dealerProfileId || dealer?.userId;
  }
}
