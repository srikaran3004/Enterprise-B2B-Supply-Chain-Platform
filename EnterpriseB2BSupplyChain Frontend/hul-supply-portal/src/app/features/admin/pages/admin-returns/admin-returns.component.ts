import { Component, OnInit, inject } from '@angular/core';
import { ReturnsService, ReturnRequest } from '../../../../core/services/returns.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-admin-returns',
  standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Manage Returns" subtitle="Review and manage dealer return requests"></hul-page-header>
      
      <div style="margin-top:20px">
        <hul-data-table [columns]="columns" [data]="returns" [loading]="loading" [totalCount]="returns.length"
          [currentPage]="1" [pageSize]="50" searchPlaceholder="Search by order number or dealer..."
          emptyMessage="No return requests found" [actions]="tableActions"
          (rowAction)="onRowAction($event)">
        </hul-data-table>
      </div>

      <!-- Approve Return Modal -->
      <hul-modal *ngIf="showApproveModal" [open]="showApproveModal" title="Approve Return Request" size="sm" (close)="showApproveModal = false">
        <div class="modal-form" *ngIf="selectedReturn">
          <p style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">
            Approving return for order <strong>{{ selectedReturn.orderNumber || selectedReturn.orderId.substring(0,8) }}</strong>
          </p>
          <div class="form-group">
            <label>Approval Notes</label>
            <textarea [(ngModel)]="resolutionNotes" rows="2" placeholder="e.g., Return verified and approved"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showApproveModal = false">Cancel</button>
            <button class="btn btn--primary" (click)="confirmApprove()">Approve Return</button>
          </div>
        </div>
      </hul-modal>

      <!-- Reject Return Modal -->
      <hul-modal *ngIf="showRejectModal" [open]="showRejectModal" title="Reject Return Request" size="sm" (close)="showRejectModal = false">
        <div class="modal-form" *ngIf="selectedReturn">
          <div class="reject-warning">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--hul-danger)" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>Rejecting return for order <strong>{{ selectedReturn.orderNumber || selectedReturn.orderId.substring(0,8) }}</strong></p>
          </div>
          <div class="form-group">
            <label>Rejection Reason * (will be sent to dealer)</label>
            <textarea [(ngModel)]="rejectionNotes" rows="3" placeholder="e.g., Return period expired, Item shows signs of usage"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showRejectModal = false">Cancel</button>
            <button class="btn btn--danger" [disabled]="!rejectionNotes.trim()" (click)="confirmReject()">Reject Return</button>
          </div>
        </div>
      </hul-modal>

      <!-- View Return Details Modal -->
      <hul-modal *ngIf="showViewModal" [open]="showViewModal" [title]="'Return Details'" size="md" (close)="showViewModal = false">
        <div class="return-detail" *ngIf="selectedReturn">
          <div class="detail-section">
            <div class="detail-row">
              <label>Return ID</label>
              <span class="mono">{{ selectedReturn.returnId }}</span>
            </div>
            <div class="detail-row">
              <label>Order ID</label>
              <span class="mono">{{ selectedReturn.orderId }}</span>
            </div>
            <div class="detail-row">
              <label>Dealer ID</label>
              <span class="mono">{{ selectedReturn.dealerId }}</span>
            </div>
            <div class="detail-row">
              <label>Status</label>
              <hul-status-badge [status]="selectedReturn.status"></hul-status-badge>
            </div>
            <div class="detail-row">
              <label>Requested</label>
              <span>{{ selectedReturn.requestedAt | date:'medium' }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Return Reason</h4>
            <p class="reason-text">{{ selectedReturn.reason }}</p>
          </div>

          <div class="detail-section" *ngIf="selectedReturn.photoUrl">
            <h4>Proof Image</h4>
            <div class="proof-image">
              <img [src]="selectedReturn.photoUrl" alt="Return proof" (click)="openImageInNewTab(selectedReturn.photoUrl)" />
              <span class="click-hint">Click to view full size</span>
            </div>
          </div>

          <div class="detail-section" *ngIf="selectedReturn.adminNotes">
            <h4>Admin Notes</h4>
            <p class="notes-text">{{ selectedReturn.adminNotes }}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button class="btn btn--ghost" (click)="showViewModal = false">Close</button>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .modal-form { padding: 8px 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all var(--duration-fast); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover { background: var(--hul-primary-hover); }
    .btn--danger { background: var(--hul-danger); color: white; }
    .btn--danger:hover { background: #dc2626; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .reject-warning { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 16px; padding: 16px; background: #fef2f2; border-radius: var(--radius-lg); }
    .reject-warning p { margin: 8px 0 0; color: var(--text-secondary); font-size: 14px; }
    .return-detail { display: flex; flex-direction: column; gap: 20px; }
    .detail-section h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-default); }
    .detail-row label { font-size: 13px; color: var(--text-tertiary); }
    .detail-row span { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .mono { font-family: var(--font-mono); font-size: 12px; }
    .reason-text, .notes-text { font-size: 14px; color: var(--text-primary); line-height: 1.5; margin: 0; padding: 12px; background: var(--bg-muted); border-radius: var(--radius-lg); }
    .proof-image { position: relative; cursor: pointer; }
    .proof-image img { max-width: 100%; max-height: 300px; border-radius: var(--radius-lg); border: 1px solid var(--border-default); }
    .click-hint { display: block; font-size: 12px; color: var(--text-tertiary); margin-top: 8px; text-align: center; }
  `]
})
export class AdminReturnsComponent implements OnInit {
  private returnsService = inject(ReturnsService);
  private toastService = inject(ToastService);

  returns: ReturnRequest[] = [];
  loading = true;

  // Modal state
  showApproveModal = false;
  showRejectModal = false;
  showViewModal = false;
  selectedReturn: ReturnRequest | null = null;
  resolutionNotes = '';
  rejectionNotes = '';

  columns: any[] = [
    { key: 'returnId', label: 'Return ID', type: 'text', formatter: (val: string) => val?.substring(0, 8).toUpperCase() },
    { key: 'orderNumber', label: 'Order #', type: 'text' },
    { key: 'reason', label: 'Reason', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeMap: { 'Pending': 'warning', 'Approved': 'success', 'Rejected': 'danger' } },
    { key: 'thumbUrl', label: 'Image', type: 'custom',
      renderHtml: (url: string) => url
        ? `<img src="${url}" width="40" height="40" style="border-radius:4px;object-fit:cover;display:block" alt="thumb" />`
        : `<span style="color:var(--text-tertiary);font-size:12px">—</span>` },
    { key: 'requestedAt', label: 'Requested', type: 'date' },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];

  tableActions: any[] = [
    { key: 'view', label: 'View', variant: 'primary' },
    { key: 'approve', label: 'Approve', variant: 'success', condition: (row: ReturnRequest) => row.status === 'Pending' },
    { key: 'reject', label: 'Reject', variant: 'danger', condition: (row: ReturnRequest) => row.status === 'Pending' },
  ];

  ngOnInit(): void {
    this.loadReturns();
  }

  loadReturns() {
    this.loading = true;
    this.returnsService.getAllReturns().subscribe({
      next: (data) => {
        this.returns = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.toastService.error('Failed to load return requests');
      }
    });
  }

  onRowAction(event: { action: string; row: ReturnRequest }) {
    this.selectedReturn = event.row;

    if (event.action === 'view') {
      this.showViewModal = true;
    } else if (event.action === 'approve') {
      this.resolutionNotes = '';
      this.showApproveModal = true;
    } else if (event.action === 'reject') {
      this.rejectionNotes = '';
      this.showRejectModal = true;
    }
  }

  confirmApprove() {
    if (!this.selectedReturn) return;

    this.returnsService.approveReturn(
      this.selectedReturn.returnId,
      this.resolutionNotes || 'Approved by admin'
    ).subscribe({
      next: () => {
        this.toastService.success('Return approved successfully');
        this.showApproveModal = false;
        this.loadReturns();
      },
      error: () => {
        this.toastService.error('Failed to approve return');
      }
    });
  }

  confirmReject() {
    if (!this.selectedReturn || !this.rejectionNotes.trim()) return;

    this.returnsService.rejectReturn(
      this.selectedReturn.returnId,
      this.rejectionNotes
    ).subscribe({
      next: () => {
        this.toastService.success('Return rejected');
        this.showRejectModal = false;
        this.loadReturns();
      },
      error: () => {
        this.toastService.error('Failed to reject return');
      }
    });
  }

  openImageInNewTab(url: string) {
    window.open(url, '_blank');
  }
}
