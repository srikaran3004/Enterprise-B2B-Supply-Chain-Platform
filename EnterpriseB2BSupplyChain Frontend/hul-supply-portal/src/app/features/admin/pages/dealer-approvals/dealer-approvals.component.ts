import { Component, OnInit } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { HulConfirmService } from '../../../../shared/ui/confirm-dialog/hul-confirm.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';

@Component({
  selector: 'app-dealer-approvals',
  standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Dealer Approvals" subtitle="Review and approve new dealer registrations"></hul-page-header>

      <hul-tabs [tabs]="tabs" [activeTab]="activeTab" (tabChange)="onTabChange($event)"></hul-tabs>

      <div style="margin-top: 20px">
        <hul-data-table
          [columns]="columns"
          [data]="filteredDealers"
          [loading]="loading"
          [totalCount]="filteredDealers.length"
          [currentPage]="1"
          [pageSize]="50"
          searchPlaceholder="Search dealers..."
          emptyMessage="No dealers found"
          [actions]="tableActions"
          (rowAction)="onRowAction($event)"
          (searchChange)="onSearch($event)">
        </hul-data-table>
      </div>

      <!-- Rejection reason inline form -->
      <hul-modal *ngIf="showRejectModal" [open]="showRejectModal" title="Reject Dealer" size="sm" (close)="showRejectModal = false">
        <div class="reject-form">
          <p style="margin-bottom: 12px; color: var(--text-secondary); font-size: 14px;">
            Provide a reason for rejecting <strong>{{ rejectingDealer?.fullName }}</strong>.
          </p>
          <textarea class="reject-textarea" [(ngModel)]="rejectReason" placeholder="Reason for rejection (visible to dealer)" rows="3"></textarea>
          <div class="reject-actions">
            <button class="btn btn--ghost" (click)="showRejectModal = false">Cancel</button>
            <button class="btn btn--danger" [disabled]="!rejectReason.trim()" (click)="confirmReject()">Confirm Rejection</button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .reject-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; resize: vertical; box-sizing: border-box; }
    .reject-textarea:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .reject-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all var(--duration-fast); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--danger { background: var(--hul-danger); color: white; }
    .btn--danger:hover { background: #dc2626; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class DealerApprovalsComponent implements OnInit {
  loading = true;
  activeTab = 'Pending';
  allDealers: any[] = [];
  filteredDealers: any[] = [];
  searchTerm = '';
  showRejectModal = false;
  rejectingDealer: any = null;
  rejectReason = '';

  tabs = [
    { label: 'All', value: 'All', count: 0 },
    { label: 'Pending', value: 'Pending', count: 0 },
    { label: 'Approved', value: 'Active', count: 0 },
    { label: 'Rejected', value: 'Rejected', count: 0 },
  ];

  columns: DataTableColumn[] = [
    { key: 'fullName', label: 'Dealer', type: 'text' },
    { key: 'businessName', label: 'Business Name', type: 'text' },
    { key: 'gstNumber', label: 'GST Number', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'createdAt', label: 'Registered', type: 'date', sortable: true },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Pending': 'warning', 'Active': 'success', 'Rejected': 'danger' } },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];

  tableActions: DataTableAction[] = [
    { key: 'approve', label: 'Approve', variant: 'primary', condition: (row: any) => row.status === 'Pending' },
    { key: 'reject', label: 'Reject', variant: 'danger', condition: (row: any) => row.status === 'Pending' },
  ];

  constructor(private http: ZoneHttpService, private confirm: HulConfirmService, private toast: ToastService) { }

  ngOnInit(): void { this.loadAllDealers(); }

  /** Always load ALL dealers so tab counts are always accurate */
  loadAllDealers(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.admin.dealers()).subscribe({
      next: dealers => {
        this.allDealers = dealers;
        // Update all tab counts from the full list - create new array to trigger change detection
        this.tabs = [
          { label: 'All', value: 'All', count: dealers.length },
          { label: 'Pending', value: 'Pending', count: dealers.filter(d => d.status === 'Pending').length },
          { label: 'Approved', value: 'Active', count: dealers.filter(d => d.status === 'Active').length },
          { label: 'Rejected', value: 'Rejected', count: dealers.filter(d => d.status === 'Rejected').length },
        ];
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  updateTabCounts(): void {
    this.tabs = [
      { label: 'All', value: 'All', count: this.allDealers.length },
      { label: 'Pending', value: 'Pending', count: this.allDealers.filter(d => d.status === 'Pending').length },
      { label: 'Approved', value: 'Active', count: this.allDealers.filter(d => d.status === 'Active').length },
      { label: 'Rejected', value: 'Rejected', count: this.allDealers.filter(d => d.status === 'Rejected').length },
    ];
  }

  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allDealers];
    // Filter by active tab
    if (this.activeTab !== 'All') {
      result = result.filter(d => d.status === this.activeTab);
    }
    // Filter by search term
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(d =>
        d.fullName?.toLowerCase().includes(s) ||
        d.email?.toLowerCase().includes(s) ||
        d.businessName?.toLowerCase().includes(s)
      );
    }
    this.filteredDealers = result;
  }

  onRowAction(event: { action: string; row: any }): void {
    if (event.action === 'approve') {
      this.confirm.confirm({
        title: 'Approve Dealer?',
        message: `${event.row.fullName} will gain access to place orders.`,
        confirmLabel: 'Approve Access',
        variant: 'info'
      }).subscribe(confirmed => {
        if (confirmed) {
          this.http.put(API_ENDPOINTS.admin.approveDealer(event.row.userId), {}).subscribe({
            next: () => {
              this.toast.success('Dealer approved. Welcome email sent.');
              // Update local state immediately
              const dealer = this.allDealers.find(d => d.userId === event.row.userId);
              if (dealer) dealer.status = 'Active';
              this.updateTabCounts();
              this.applyFilters();
            },
            error: err => this.toast.error(err.error?.error || 'Failed to approve dealer')
          });
        }
      });
    } else if (event.action === 'reject') {
      this.rejectingDealer = event.row;
      this.rejectReason = '';
      this.showRejectModal = true;
    }
  }

  confirmReject(): void {
    if (this.rejectingDealer) {
      this.http.put(API_ENDPOINTS.admin.rejectDealer(this.rejectingDealer.userId), { reason: this.rejectReason }).subscribe({
        next: () => {
          this.toast.success('Dealer rejected.');
          // Update local state immediately
          const dealer = this.allDealers.find(d => d.userId === this.rejectingDealer.userId);
          if (dealer) dealer.status = 'Rejected';
          this.showRejectModal = false;
          this.updateTabCounts();
          this.applyFilters();
        },
        error: err => this.toast.error(err.error?.error || 'Failed to reject dealer')
      });
    }
  }
}
