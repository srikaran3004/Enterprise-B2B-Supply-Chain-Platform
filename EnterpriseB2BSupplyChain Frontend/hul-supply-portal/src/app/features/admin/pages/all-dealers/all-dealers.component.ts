import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-all-dealers', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="All Dealers" subtitle="Manage all registered dealers">
        <div page-actions style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <!-- State Filter -->
          <select class="filter-select" [(ngModel)]="stateFilter" (change)="applyFilters()">
            <option value="">All States</option>
            <option *ngFor="let s of availableStates" [value]="s">{{ s }}</option>
          </select>
          <!-- Status Filter -->
          <select class="filter-select" [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
            <option value="Rejected">Rejected</option>
          </select>
          <!-- Purchase Volume Filter -->
          <select class="filter-select" [(ngModel)]="purchaseFilter" (change)="applyFilters()">
            <option value="">All Purchases</option>
            <option value="high_volume">High Volume (> ₹1L)</option>
            <option value="regular_volume">Regular (> ₹10k)</option>
            <option value="no_purchase">New / No Purchase</option>
          </select>
          <button class="btn-clear-filters" *ngIf="stateFilter || statusFilter || purchaseFilter" (click)="clearFilters()">Clear Filters</button>
        </div>
      </hul-page-header>

      <hul-data-table [columns]="columns" [data]="dealers" [loading]="loading" [totalCount]="dealers.length"
        [currentPage]="1" [pageSize]="50" searchPlaceholder="Search dealers by name, email, or GST..."
        emptyMessage="No dealers found" [actions]="tableActions" [selectable]="false"
        (searchChange)="onSearch($event)" (rowAction)="onRowAction($event)">
      </hul-data-table>

      <!-- View Dealer Modal -->
      <hul-modal *ngIf="showViewModal" [open]="showViewModal" [title]="viewingDealer?.fullName || 'Dealer Details'" size="xl" (close)="showViewModal = false">
        <div class="dealer-detail-view" *ngIf="viewingDealer">
          <div class="tabs">
            <button class="tab" [class.tab--active]="activeTab === 'overview'" (click)="activeTab = 'overview'">Overview</button>
            <button class="tab" [class.tab--active]="activeTab === 'orders'" (click)="activeTab = 'orders'">Orders</button>
            <button class="tab" [class.tab--active]="activeTab === 'payments'" (click)="activeTab = 'payments'">Payments</button>
            <button class="tab" [class.tab--active]="activeTab === 'credit'" (click)="activeTab = 'credit'">Purchase Limit</button>
          </div>

          <div *ngIf="loadingDetails" class="loading-state">
            <div class="spinner"></div><p>Loading dealer information...</p>
          </div>

          <!-- Overview Tab -->
          <div *ngIf="activeTab === 'overview' && !loadingDetails" class="tab-content">
            <div class="overview-grid">
              <div class="info-card">
                <div class="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>
                  <h3 class="section-title">Business Information</h3>
                </div>
                <div class="info-grid">
                  <div class="info-item"><label class="detail-label">Business Name</label><span class="detail-value">{{ viewingDealer.businessName || '—' }}</span></div>
                  <div class="info-item"><label class="detail-label">GST Number</label><span class="detail-value mono">{{ viewingDealer.gstNumber || '—' }}</span></div>
                  <div class="info-item"><label class="detail-label">Email</label><span class="detail-value">{{ viewingDealer.email }}</span></div>
                  <div class="info-item"><label class="detail-label">Phone</label><span class="detail-value">{{ viewingDealer.phoneNumber || '—' }}</span></div>
                  <div class="info-item"><label class="detail-label">Address</label><span class="detail-value">{{ viewingDealer.addressLine1 || '—' }}</span></div>
                  <div class="info-item"><label class="detail-label">Location</label><span class="detail-value">{{ viewingDealer.city }}, {{ viewingDealer.state }} - {{ viewingDealer.pinCode }}</span></div>
                  <div class="info-item">
                    <label class="detail-label">Status</label>
                    <span class="status-badge" [ngClass]="'status-badge--' + (viewingDealer.status | lowercase)">{{ viewingDealer.status }}</span>
                  </div>
                  <div class="info-item"><label class="detail-label">Registered</label><span class="detail-value">{{ viewingDealer.createdAt | date:'medium' }}</span></div>
                </div>
              </div>
              <div class="stats-container">
                <div class="stat-card" *ngFor="let stat of dealerStatCards">
                  <div class="stat-icon" [style.background]="stat.bg" [style.color]="stat.color">
                    <div class="stat-icon__svg" [innerHTML]="stat.safeIcon"></div>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{{ stat.value }}</span>
                    <span class="stat-label">{{ stat.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Orders Tab -->
          <div *ngIf="activeTab === 'orders' && !loadingDetails" class="tab-content">
            <div class="table-header"><h3>Order History ({{ dealerOrders.length }})</h3></div>
            <div *ngIf="dealerOrders.length === 0" class="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <p>No orders found</p>
            </div>
            <table *ngIf="dealerOrders.length > 0" class="data-table">
              <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                <tr *ngFor="let order of dealerOrders">
                  <td><strong>{{ order.orderNumber }}</strong></td>
                  <td>{{ order.placedAt | date:'medium' }}</td>
                  <td>{{ order.items?.length || 0 }} items</td>
                  <td><strong>₹{{ formatNum(order.totalAmount) }}</strong></td>
                  <td><hul-status-badge [status]="order.status"></hul-status-badge></td>
                  <td><span class="pill">{{ order.paymentMethod || 'Credit' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Payments Tab -->
          <div *ngIf="activeTab === 'payments' && !loadingDetails" class="tab-content">
            <div class="table-header"><h3>Payment History ({{ dealerPayments.length }})</h3></div>
            <div *ngIf="dealerPayments.length === 0" class="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <p>No payments found</p>
            </div>
            <table *ngIf="dealerPayments.length > 0" class="data-table">
              <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let payment of dealerPayments">
                  <td><strong>{{ payment.invoiceNumber }}</strong></td>
                  <td>{{ payment.paidAt | date:'medium' }}</td>
                  <td><strong>₹{{ formatNum(payment.amount) }}</strong></td>
                  <td><span class="pill">{{ payment.paymentMethod }}</span></td>
                  <td><span class="badge badge--success">{{ payment.status }}</span></td>
                  <td>
                    <button class="download-btn" (click)="downloadInvoice(payment.invoiceId)" title="Download Invoice PDF">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      PDF
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Purchase Limit Tab -->
          <div *ngIf="activeTab === 'credit' && !loadingDetails" class="tab-content">
            <!-- Suspended banner -->
            <div *ngIf="viewingDealer?.status === 'Suspended'" class="suspended-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              <div class="suspended-banner__text">
                <strong>Account Suspended</strong>
                <span>Purchase limit management is disabled for suspended dealers. Reactivate this dealer to manage limits.</span>
              </div>
            </div>
            <div class="credit-overview" *ngIf="dealerCredit" [class.credit-overview--disabled]="viewingDealer?.status === 'Suspended'">
              <div class="credit-card">
                <div class="credit-header">
                  <h3 class="section-title">Purchase Limit Account</h3>
                  <button class="btn btn--sm btn--primary" (click)="editCreditLimit(viewingDealer)" [disabled]="viewingDealer?.status === 'Suspended'">Edit Limit</button>
                </div>
                <div class="credit-stats">
                  <div class="credit-stat"><label class="detail-label">Monthly Purchase Limit</label><span class="detail-value">₹{{ formatNum(dealerCredit.creditLimit) }}</span></div>
                  <div class="credit-stat"><label class="detail-label">Outstanding</label><span class="detail-value" [style.color]="dealerCredit.outstanding > 0 ? 'var(--hul-danger)' : 'var(--text-primary)'">₹{{ formatNum(dealerCredit.outstanding) }}</span></div>
                  <div class="credit-stat"><label class="detail-label">Available Purchase Limit</label><span class="detail-value" style="color:var(--hul-success)">₹{{ formatNum(dealerCredit.available) }}</span></div>
                </div>
                <div class="credit-utilization">
                  <div class="utilization-header">
                    <span class="detail-label">Purchase Limit Utilization</span>
                    <span class="detail-value">{{ dealerCredit.utilization }}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="dealerCredit.utilization" [class.progress-fill--danger]="dealerCredit.utilization > 80" [class.progress-fill--warning]="dealerCredit.utilization > 50 && dealerCredit.utilization <= 80"></div>
                  </div>
                </div>
              </div>
              <div class="invoices-section">
                <div class="invoices-header">
                  <h3 class="section-title">Invoices ({{ dealerInvoices.length }})</h3>
                </div>
                <div *ngIf="dealerInvoices.length === 0" class="empty-state">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No invoices found</p>
                </div>
                <table *ngIf="dealerInvoices.length > 0" class="data-table">
                  <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Download</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let invoice of dealerInvoices">
                      <td><strong>{{ invoice.invoiceNumber }}</strong></td>
                      <td>{{ invoice.createdAt | date:'shortDate' }}</td>
                      <td><strong>₹{{ formatNum(invoice.totalAmount ?? invoice.grandTotal ?? 0) }}</strong></td>
                      <td><hul-status-badge [status]="invoice.status"></hul-status-badge></td>
                      <td>{{ invoice.dueDate | date:'shortDate' }}</td>
                      <td>
                        <button class="download-btn" (click)="downloadInvoice(invoice.invoiceId)" title="Download PDF">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          PDF
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="invoices-section">
                <div class="invoices-header" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <h3 class="section-title">Purchase Limit Change History ({{ filteredPurchaseLimitHistory.length }})</h3>
                  <select class="filter-select" [(ngModel)]="purchaseLimitHistoryMonthFilter" (change)="applyPurchaseLimitHistoryFilter()">
                    <option value="">All Months</option>
                    <option *ngFor="let month of purchaseLimitHistoryMonths" [value]="month">{{ month }}</option>
                  </select>
                </div>
                <div *ngIf="filteredPurchaseLimitHistory.length === 0" class="empty-state">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No purchase-limit change history found</p>
                </div>
                <table *ngIf="filteredPurchaseLimitHistory.length > 0" class="data-table">
                  <thead><tr><th>Changed At</th><th>Previous Limit</th><th>New Limit</th><th>Changed By</th><th>Reason</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let row of filteredPurchaseLimitHistory">
                      <td>{{ row.changedAt | date:'medium' }}</td>
                      <td>₹{{ formatNum(row.previousLimit || 0) }}</td>
                      <td><strong>₹{{ formatNum(row.newLimit || 0) }}</strong></td>
                      <td>{{ row.changedByRole || 'System' }}</td>
                      <td>{{ row.reason || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button class="btn btn--danger" (click)="deleteDealer(viewingDealer)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete Dealer
          </button>
          <button class="btn btn--ghost" (click)="showViewModal = false">Close</button>
        </div>
      </hul-modal>

      <!-- Delete Confirmation Modal -->
      <hul-modal *ngIf="showDeleteModal" [open]="showDeleteModal" title="Delete Dealer" size="sm" (close)="showDeleteModal = false">
        <div class="action-form" *ngIf="deletingDealer">
          <div class="action-warning action-warning--danger">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--hul-danger)" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <h4>Delete {{ deletingDealer.fullName }}?</h4>
              <p>This is permanent and cannot be undone. The dealer will be notified via email.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Reason for deletion <span class="req">*</span></label>
            <textarea [(ngModel)]="deleteReason" rows="3" placeholder="e.g., Violation of terms, Business closure..." class="form-textarea"></textarea>
          </div>
          <div class="form-footer">
            <button class="btn btn--ghost" (click)="showDeleteModal = false">Cancel</button>
            <button class="btn btn--danger" [disabled]="!deleteReason.trim() || deleting" (click)="confirmDelete()">
              <span *ngIf="deleting" class="btn-spinner"></span>
              {{ deleting ? 'Deleting...' : 'Permanently Delete' }}
            </button>
          </div>
        </div>
      </hul-modal>

      <!-- Suspend Confirmation Modal -->
      <hul-modal *ngIf="showSuspendModal" [open]="showSuspendModal" title="Suspend Dealer" size="sm" (close)="showSuspendModal = false">
        <div class="action-form" *ngIf="suspendingDealer">
          <div class="action-warning action-warning--warning">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--hul-warning)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <h4>Suspend {{ suspendingDealer.fullName }}?</h4>
              <p>The dealer will be blocked from placing orders. You can reactivate them later. An email will be sent with the reason.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Reason for suspension <span class="req">*</span></label>
            <textarea [(ngModel)]="suspendReason" rows="3" placeholder="e.g., Overdue payments, Policy violation..." class="form-textarea"></textarea>
          </div>
          <div class="form-footer">
            <button class="btn btn--ghost" (click)="showSuspendModal = false">Cancel</button>
            <button class="btn btn--warning" [disabled]="!suspendReason.trim() || suspending" (click)="confirmSuspend()">
              <span *ngIf="suspending" class="btn-spinner"></span>
              {{ suspending ? 'Suspending...' : 'Suspend Dealer' }}
            </button>
          </div>
        </div>
      </hul-modal>

      <!-- Edit Purchase Limit Modal -->
      <hul-modal *ngIf="showCreditModal" [open]="showCreditModal" title="Update Monthly Purchase Limit" size="sm" (close)="showCreditModal = false">
        <div class="action-form" *ngIf="editingCreditDealer">
          <div class="dealer-info">
            <div class="dealer-avatar">{{ editingCreditDealer.fullName?.charAt(0)?.toUpperCase() }}</div>
            <div>
              <div class="dealer-name">{{ editingCreditDealer.fullName }}</div>
              <div class="dealer-biz">{{ editingCreditDealer.businessName }}</div>
            </div>
          </div>
          <div class="credit-stats-row">
            <div class="cstat-box"><span class="cstat-lbl">Current Limit</span><span class="cstat-val">₹{{ formatNum(dealerCredit?.creditLimit || 500000) }}</span></div>
            <div class="cstat-box"><span class="cstat-lbl">Outstanding</span><span class="cstat-val cstat-val--danger">₹{{ formatNum(dealerCredit?.outstanding || 0) }}</span></div>
          </div>
          <div class="form-group">
            <label>New Monthly Purchase Limit <span class="req">*</span></label>
            <div class="input-wrap">
              <span class="input-prefix">₹</span>
              <input type="number" [(ngModel)]="newCreditLimit" placeholder="0" min="0" step="1000" class="form-input form-input--prefix" />
            </div>
          </div>
          <div class="form-footer">
            <button class="btn btn--ghost" (click)="showCreditModal = false">Cancel</button>
            <button class="btn btn--primary" [disabled]="!newCreditLimit || newCreditLimit < 0 || savingCredit" (click)="confirmCreditUpdate()">
              <span *ngIf="savingCredit" class="btn-spinner"></span>
              {{ savingCredit ? 'Saving...' : 'Update Limit' }}
            </button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    /* Filters */
    .filter-select {
      padding: 7px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-md);
      background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-family: var(--font-body);
      cursor: pointer; min-width: 140px;
    }
    .filter-select:focus { outline: none; border-color: var(--border-focus); }
    .btn-clear-filters {
      padding: 7px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default);
      background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer;
    }
    .btn-clear-filters:hover { background: var(--bg-muted); }

    /* Dealer detail */
    .dealer-detail-view { min-height: 400px; }
    .tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border-default); margin-bottom: 24px; }
    .tab { padding: 10px 20px; background: none; border: none; font-size: 14px; font-weight: 600; color: var(--text-tertiary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 150ms; font-family: var(--font-body); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
    .tab:hover { color: var(--text-primary); background: var(--bg-muted); }
    .tab--active { color: var(--hul-primary); border-bottom-color: var(--hul-primary); }
    .tab-content { animation: fadeSlideUp 200ms ease; }
    @keyframes fadeSlideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; }
    .spinner { width: 36px; height: 36px; border: 3px solid var(--border-default); border-top-color: var(--hul-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Status badge */
    .status-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .status-badge--active { background: rgba(16,185,129,.12); color: #059669; }
    .status-badge--pending { background: rgba(245,158,11,.12); color: #d97706; }
    .status-badge--suspended { background: rgba(239,68,68,.12); color: #dc2626; }
    .status-badge--rejected { background: rgba(107,114,128,.12); color: #6b7280; }

    .mono { font-family: var(--font-mono); }
    .overview-grid { display: flex; flex-direction: column; gap: 20px; }
    .info-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; }
    .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: var(--text-primary); }
    .section-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
    .detail-value { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .stats-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 14px; display: flex; align-items: center; gap: 12px; }
    .stat-icon { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon__svg { display: flex; align-items: center; justify-content: center; line-height: 0; }
    .stat-icon__svg svg { display: block; }
    .stat-content { display: flex; flex-direction: column; gap: 3px; }
    .stat-value { font-size: 20px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); line-height: 1; }
    .stat-label { font-size: 12px; color: var(--text-tertiary); }

    /* Table */
    .table-header { margin-bottom: 14px; }
    .table-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table thead { background: var(--bg-muted); }
    .data-table th { text-align: left; padding: 10px 14px; font-weight: 600; color: var(--text-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .data-table td { padding: 10px 14px; border-top: 1px solid var(--border-default); color: var(--text-primary); }
    .data-table tbody tr:hover { background: var(--bg-subtle); }
    .pill { display: inline-block; padding: 3px 8px; background: var(--bg-muted); border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; color: var(--text-secondary); }
    .badge { display: inline-block; padding: 3px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; }
    .badge--success { background: rgba(16,185,129,.1); color: var(--hul-success); }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: var(--text-tertiary); gap: 12px; }
    .empty-state svg { opacity: .3; }
    .empty-state p { margin: 0; font-size: 14px; }

    /* Download button */
    .download-btn {
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px;
      border: 1px solid var(--border-default); border-radius: var(--radius-sm);
      background: transparent; color: var(--hul-primary); font-size: 11px; font-weight: 600;
      cursor: pointer; transition: all 100ms ease; font-family: var(--font-body);
    }
    .download-btn:hover { background: var(--hul-primary); color: white; border-color: var(--hul-primary); }

    /* Credit */
    .credit-overview { display: flex; flex-direction: column; gap: 20px; }
    .credit-overview--disabled { opacity: 0.45; pointer-events: none; filter: grayscale(40%); user-select: none; }
    .suspended-banner {
      display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; margin-bottom: 16px;
      background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.18); border-radius: var(--radius-lg);
      color: var(--hul-danger);
    }
    .suspended-banner svg { flex-shrink: 0; margin-top: 2px; }
    .suspended-banner__text { display: flex; flex-direction: column; gap: 4px; }
    .suspended-banner__text strong { font-size: 14px; font-weight: 700; color: var(--hul-danger); }
    .suspended-banner__text span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .credit-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; }
    .credit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .credit-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
    .credit-stat { display: flex; flex-direction: column; gap: 5px; }
    .credit-utilization { display: flex; flex-direction: column; gap: 8px; }
    .utilization-header { display: flex; justify-content: space-between; }
    .progress-bar { height: 10px; background: var(--bg-muted); border-radius: var(--radius-full); overflow: hidden; }
    .progress-fill { height: 100%; background: var(--hul-primary); transition: width 0.3s; }
    .progress-fill--warning { background: var(--hul-warning); }
    .progress-fill--danger { background: var(--hul-danger); }
    .invoices-section { display: flex; flex-direction: column; gap: 14px; }
    .invoices-header { display: flex; justify-content: space-between; align-items: center; }

    /* Action Forms in Modals */
    .action-form { display: flex; flex-direction: column; gap: 18px; }
    .action-warning { display: flex; align-items: flex-start; gap: 14px; padding: 14px; border-radius: var(--radius-lg); }
    .action-warning--danger { background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.2); }
    .action-warning--warning { background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.2); }
    .action-warning h4 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .action-warning p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
    .req { color: var(--hul-danger); }
    .form-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; min-height: 88px; resize: none; box-sizing: border-box; }
    .form-textarea:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }

    /* Purchase limit in modal */
    .dealer-info { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-default); }
    .dealer-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--hul-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; font-family: var(--font-display); flex-shrink: 0; }
    .dealer-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .dealer-biz { font-size: 12px; color: var(--text-tertiary); }
    .credit-stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .cstat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-default); }
    .cstat-lbl { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; }
    .cstat-val { font-size: 17px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
    .cstat-val--danger { color: var(--hul-danger); }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-prefix { position: absolute; left: 12px; font-size: 14px; font-weight: 600; color: var(--text-tertiary); pointer-events: none; }
    .form-input { width: 100%; padding: 11px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-size: 15px; font-family: var(--font-mono); box-sizing: border-box; }
    .form-input--prefix { padding-left: 28px; }
    .form-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }

    /* Buttons */
    .modal-footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-default); }
    .form-footer { display: flex; gap: 10px; justify-content: flex-end; }
    .btn { padding: 10px 18px; border-radius: var(--radius-lg); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); display: inline-flex; align-items: center; gap: 6px; transition: all 150ms; }
    .btn--sm { padding: 7px 14px; font-size: 12px; }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--danger { background: var(--hul-danger); color: white; }
    .btn--danger:hover { background: #dc2626; }
    .btn--warning { background: #f59e0b; color: white; }
    .btn--warning:hover { background: #d97706; }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }

    @media (max-width: 900px) {
      .info-grid, .credit-stats, .stats-container { grid-template-columns: 1fr; }
      .credit-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class AllDealersComponent implements OnInit {
  loading = true;
  dealers: any[] = [];
  allDealers: any[] = [];

  // Filters
  stateFilter = '';
  statusFilter = '';
  purchaseFilter = '';
  searchTerm = '';
  availableStates: string[] = [];

  // Modal state
  showViewModal = false;
  viewingDealer: any = null;
  dealerOrders: any[] = [];
  dealerStats: any = null;
  dealerStatCards: any[] = [];
  dealerCredit: any = null;
  dealerInvoices: any[] = [];
  dealerPayments: any[] = [];
  purchaseLimitHistory: any[] = [];
  filteredPurchaseLimitHistory: any[] = [];
  purchaseLimitHistoryMonths: string[] = [];
  purchaseLimitHistoryMonthFilter = '';
  loadingDetails = false;
  activeTab = 'overview';

  showDeleteModal = false;
  deletingDealer: any = null;
  deleteReason = '';
  deleting = false;

  showSuspendModal = false;
  suspendingDealer: any = null;
  suspendReason = '';
  suspending = false;

  showCreditModal = false;
  editingCreditDealer: any = null;
  newCreditLimit: number = 0;
  savingCredit = false;

  columns: DataTableColumn[] = [
    { key: 'serial', label: '#', type: 'text', width: '50px', align: 'center' },
    { key: 'fullName', label: 'Dealer', type: 'text', sortable: true },
    { key: 'businessName', label: 'Business', type: 'text' },
    { key: 'gstNumber', label: 'GST', type: 'text' },
    { key: 'state', label: 'State', type: 'text', sortable: true },
    { key: 'status', label: 'Status', type: 'badge', sortable: true, width: '110px', align: 'center', badgeMap: { 'Pending': 'warning', 'Active': 'success', 'Rejected': 'danger', 'Suspended': 'default' } },
    { key: 'totalSpent', label: 'Total Purchased', type: 'currency-inr', sortable: true },
    { key: 'createdAt', label: 'Registered', type: 'date', sortable: true },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];

  tableActions: DataTableAction[] = [
    { key: 'view', label: 'View Profile', variant: 'primary' },
    { key: 'suspend', label: 'Suspend', variant: 'danger', condition: (row: any) => row.status === 'Active' },
    { key: 'reactivate', label: 'Reactivate', variant: 'primary', condition: (row: any) => row.status !== 'Active' },
  ];

  private destroyRef = inject(DestroyRef);

  constructor(private http: ZoneHttpService, private toast: ToastService, private sanitizer: DomSanitizer) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;

    // Step 1: Get all dealers
    this.http.get<any[]>(API_ENDPOINTS.admin.dealers()).pipe(
      // Step 2: Use switchMap to chain orders request and prevent race conditions
      switchMap(dealers =>
        this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=1000').pipe(
          map(orderResponse => ({ dealers, orderResponse })),
          catchError(() => of({ dealers, orderResponse: null })) // Fallback if orders fail
        )
      ),
      takeUntilDestroyed(this.destroyRef) // Prevents memory leaks if component is destroyed
    ).subscribe({
      next: ({ dealers, orderResponse }) => {
        if (!orderResponse) {
          // Fallback logic
          this.allDealers = dealers.map((d, i) => ({ ...d, serial: i + 1, totalSpent: 0 }));
          const fallbackStates = new Set(dealers.map(d => d.state).filter(Boolean));
          this.availableStates = Array.from(fallbackStates).sort();
          this.applyFilters();
          this.loading = false;
          return;
        }

        const allOrders = orderResponse.items || orderResponse || [];

        this.allDealers = dealers.map((d, i) => {
          // Calculate total spent for this specific dealer
          const dealerOrders = allOrders.filter((o: any) =>
            o.dealerEmail === d.email || o.dealerId === d.userId || o.dealerId === d.dealerProfileId
          );
          const totalSpent = dealerOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

          return {
            ...d,
            serial: i + 1,
            totalSpent: totalSpent
          };
        });

        const states = new Set(dealers.map(d => d.state).filter(Boolean));
        this.availableStates = Array.from(states).sort();
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    let filtered = [...this.allDealers];
    if (this.stateFilter) filtered = filtered.filter(d => d.state === this.stateFilter);
    if (this.statusFilter) filtered = filtered.filter(d => d.status === this.statusFilter);
    if (this.purchaseFilter === 'high_volume') filtered = filtered.filter(d => (d.totalSpent || 0) > 100000);
    if (this.purchaseFilter === 'regular_volume') filtered = filtered.filter(d => (d.totalSpent || 0) > 10000 && (d.totalSpent || 0) <= 100000);
    if (this.purchaseFilter === 'no_purchase') filtered = filtered.filter(d => (d.totalSpent || 0) === 0);
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      filtered = filtered.filter(d => d.fullName?.toLowerCase().includes(s) || d.email?.toLowerCase().includes(s) || d.gstNumber?.toLowerCase().includes(s));
    }
    this.dealers = filtered;
  }

  clearFilters(): void {
    this.stateFilter = '';
    this.statusFilter = '';
    this.purchaseFilter = '';
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  onRowAction(e: any): void {
    if (e.action === 'view') this.viewDealer(e.row);
    else if (e.action === 'suspend') this.openSuspend(e.row);
    else if (e.action === 'reactivate') this.reactivateDealer(e.row);
  }

  viewDealer(dealer: any): void {
    this.viewingDealer = dealer;
    this.dealerOrders = [];
    this.dealerStats = null;
    this.dealerStatCards = [];
    this.dealerCredit = null;
    this.dealerInvoices = [];
    this.dealerPayments = [];
    this.purchaseLimitHistory = [];
    this.filteredPurchaseLimitHistory = [];
    this.purchaseLimitHistoryMonths = [];
    this.purchaseLimitHistoryMonthFilter = '';
    this.activeTab = 'overview';
    this.showViewModal = true;
    this.loadingDetails = true;

    // Load orders
    this.http.get<any>(API_ENDPOINTS.orders.base() + '?pageSize=100').subscribe({
      next: (response: any) => {
        const allOrders = response.items || response || [];
        const dealerFinancialId = this.getDealerFinancialId(dealer);
        this.dealerOrders = allOrders.filter((o: any) => o.dealerEmail === dealer.email || o.dealerId === dealerFinancialId);
        const stats = {
          totalOrders: this.dealerOrders.length,
          totalSpent: this.dealerOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
          pendingOrders: this.dealerOrders.filter((o: any) => !['Delivered', 'Cancelled'].includes(o.status)).length,
          completedOrders: this.dealerOrders.filter((o: any) => o.status === 'Delivered').length,
          cancelledOrders: this.dealerOrders.filter((o: any) => o.status === 'Cancelled').length,
          avgOrderValue: this.dealerOrders.length ? this.dealerOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) / this.dealerOrders.length : 0
        };
        this.dealerStats = stats;
        this.dealerStatCards = [
          { label: 'Total Orders', value: stats.totalOrders, bg: 'rgba(3,105,161,.1)', color: 'var(--hul-primary)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>') },
          { label: 'Total Spent', value: '₹' + this.formatNum(stats.totalSpent), bg: 'rgba(16,185,129,.1)', color: 'var(--hul-success)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>') },
          { label: 'Pending', value: stats.pendingOrders, bg: 'rgba(245,158,11,.1)', color: 'var(--hul-warning)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>') },
          { label: 'Completed', value: stats.completedOrders, bg: 'rgba(16,185,129,.1)', color: 'var(--hul-success)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>') },
          { label: 'Cancelled', value: stats.cancelledOrders, bg: 'rgba(239,68,68,.1)', color: 'var(--hul-danger)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>') },
          { label: 'Avg. Order', value: '₹' + this.formatNum(Math.round(stats.avgOrderValue)), bg: 'rgba(59,130,246,.1)', color: 'var(--hul-info)', safeIcon: this.trustSvg('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>') },
        ];
        this.loadingDetails = false;
      },
      error: () => { this.loadingDetails = false; }
    });

    // Load credit
    this.http.get<any>(API_ENDPOINTS.payment.purchaseLimitAccount(this.getDealerFinancialId(dealer))).subscribe({
      next: (credit: any) => {
        const limit = credit.purchaseLimit || 500000;
        const outstanding = credit.utilizedAmount || 0;
        this.dealerCredit = {
          creditLimit: limit,
          outstanding,
          available: credit.availableLimit ?? (limit - outstanding),
          utilization: credit.utilizationPercent ?? (limit ? Math.round(outstanding / limit * 100) : 0)
        };
      },
      error: () => {
        this.dealerCredit = { creditLimit: 500000, outstanding: 0, available: 500000, utilization: 0 };
      }
    });

    // Load invoices
    this.http.get<any[]>(API_ENDPOINTS.payment.invoicesByDealer(this.getDealerFinancialId(dealer))).subscribe({
      next: (invoices: any) => {
        const rawInvoices = Array.isArray(invoices) ? invoices : [];

        this.dealerInvoices = rawInvoices.map(inv => ({
          ...inv,
          createdAt: inv.createdAt || inv.generatedAt,
          totalAmount: inv.totalAmount ?? inv.grandTotal ?? 0,
          status: inv.status || inv.paymentStatus || (inv.paidAt ? 'Paid' : 'Unpaid'),
          paymentMethod: inv.paymentMethod || inv.paymentMode,
          dueDate: inv.dueDate || null
        }));

        this.dealerPayments = this.dealerInvoices.filter(inv => inv.paidAt).map(inv => ({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount ?? inv.grandTotal ?? 0,
          paidAt: inv.paidAt,
          paymentMethod: inv.paymentMethod || inv.paymentMode || 'Prepaid',
          status: inv.paymentStatus || 'Paid'
        }));
      },
      error: () => { this.dealerInvoices = []; this.dealerPayments = []; }
    });

    this.http.get<any[]>(API_ENDPOINTS.payment.purchaseLimitHistoryByDealer(this.getDealerFinancialId(dealer))).subscribe({
      next: rows => {
        const data = Array.isArray(rows) ? rows : [];
        this.purchaseLimitHistory = data;
        const monthSet = new Set<string>();
        data.forEach(r => {
          if (!r?.changedAt) return;
          const d = new Date(r.changedAt);
          if (Number.isNaN(d.getTime())) return;
          const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
          monthSet.add(label);
        });
        this.purchaseLimitHistoryMonths = Array.from(monthSet);
        this.applyPurchaseLimitHistoryFilter();
      },
      error: () => {
        this.purchaseLimitHistory = [];
        this.filteredPurchaseLimitHistory = [];
      }
    });
  }

  applyPurchaseLimitHistoryFilter(): void {
    if (!this.purchaseLimitHistoryMonthFilter) {
      this.filteredPurchaseLimitHistory = [...this.purchaseLimitHistory];
      return;
    }

    this.filteredPurchaseLimitHistory = this.purchaseLimitHistory.filter(r => {
      if (!r?.changedAt) return false;
      const d = new Date(r.changedAt);
      if (Number.isNaN(d.getTime())) return false;
      const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      return label === this.purchaseLimitHistoryMonthFilter;
    });
  }

  downloadInvoice(invoiceId: string): void {
    if (!invoiceId) { this.toast.error('Invoice not available for download'); return; }
    const url = API_ENDPOINTS.payment.downloadInvoice(invoiceId);
    // Open in new tab — browser handles the PDF download
    window.open(url, '_blank');
  }

  // ========== Delete ==========
  deleteDealer(dealer: any): void {
    this.showViewModal = false;
    this.deletingDealer = dealer;
    this.deleteReason = '';
    this.deleting = false;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deletingDealer || !this.deleteReason.trim()) return;
    this.deleting = true;
    const id = this.deletingDealer.userId;
    const name = this.deletingDealer.fullName;

    this.http.delete(API_ENDPOINTS.admin.deleteDealer(id), { reason: this.deleteReason }).subscribe({
      next: () => {
        this.toast.success(`Dealer "${name}" deleted and notified via email`);
        this.showDeleteModal = false;
        this.deleting = false;
        this.deletingDealer = null;
        this.deleteReason = '';
        this.allDealers = this.allDealers.filter(d => d.userId !== id);
        this.applyFilters();
      },
      error: err => {
        this.toast.error(err.error?.error || 'Failed to delete dealer');
        this.deleting = false;
      }
    });
  }

  // ========== Suspend ==========
  openSuspend(dealer: any): void {
    if (dealer.status !== 'Active') {
      this.toast.error('Only Active dealers can be suspended');
      return;
    }
    this.suspendingDealer = dealer;
    this.suspendReason = '';
    this.suspending = false;
    this.showSuspendModal = true;
  }

  confirmSuspend(): void {
    if (!this.suspendingDealer || !this.suspendReason.trim()) return;
    this.suspending = true;
    const id = this.suspendingDealer.userId;
    const name = this.suspendingDealer.fullName;

    this.http.put(API_ENDPOINTS.admin.suspendDealer(id), { reason: this.suspendReason }).subscribe({
      next: () => {
        this.toast.success(`Dealer "${name}" suspended and notified via email`);
        this.showSuspendModal = false;
        this.suspending = false;
        // Update in local list
        const dealer = this.allDealers.find(d => d.userId === id);
        if (dealer) dealer.status = 'Suspended';
        this.applyFilters();
      },
      error: err => {
        this.toast.error(err.error?.error || 'Failed to suspend dealer');
        this.suspending = false;
      }
    });
  }

  // ========== Reactivate ==========
  reactivateDealer(dealer: any): void {
    if (dealer.status === 'Active') { this.toast.error('Dealer is already active'); return; }
    this.http.put(API_ENDPOINTS.admin.reactivateDealer(dealer.userId), {}).subscribe({
      next: () => {
        this.toast.success(`Dealer "${dealer.fullName}" reactivated`);
        const d = this.allDealers.find(x => x.userId === dealer.userId);
        if (d) d.status = 'Active';
        this.applyFilters();
      },
      error: err => this.toast.error(err.error?.error || 'Failed to reactivate dealer')
    });
  }

  // ========== Purchase Limit ==========
  editCreditLimit(dealer: any): void {
    this.editingCreditDealer = dealer;
    this.savingCredit = false;
    // Always fetch fresh credit data before opening the modal so the displayed
    // current limit is never stale or defaulted to a hardcoded value
    this.http.get<any>(API_ENDPOINTS.payment.purchaseLimitAccount(this.getDealerFinancialId(dealer))).subscribe({
      next: (credit: any) => {
        const limit = credit.purchaseLimit || 0;
        const outstanding = credit.utilizedAmount || 0;
        this.dealerCredit = {
          creditLimit: limit,
          outstanding,
          available: credit.availableLimit ?? (limit - outstanding),
          utilization: credit.utilizationPercent ?? (limit ? Math.round(outstanding / limit * 100) : 0)
        };
        this.newCreditLimit = limit;
        this.showCreditModal = true;
      },
      error: () => {
        // If fetch fails, use whatever is already in dealerCredit (from viewDealer load)
        this.newCreditLimit = this.dealerCredit?.creditLimit || 0;
        this.showCreditModal = true;
      }
    });
  }

  confirmCreditUpdate(): void {
    if (!this.editingCreditDealer || !this.newCreditLimit || this.newCreditLimit < 0) return;
    this.savingCredit = true;
    const dealerFinancialId = this.getDealerFinancialId(this.editingCreditDealer);
    const newLimit = this.newCreditLimit;
    // Backend expects { NewLimit: number } — capital N per UpdateLimitRequest record
    this.http.put(API_ENDPOINTS.payment.purchaseLimit(dealerFinancialId), { NewLimit: newLimit }).subscribe({
      next: () => {
        this.toast.success(`Purchase limit updated to ₹${this.formatNum(newLimit)}`);
        this.showCreditModal = false;
        this.savingCredit = false;
        // Re-fetch credit info from DB and patch ALL local state
        this.http.get<any>(API_ENDPOINTS.payment.purchaseLimitAccount(dealerFinancialId)).subscribe({
          next: (credit: any) => {
            const limit = credit.purchaseLimit || newLimit;
            const outstanding = credit.utilizedAmount || 0;
            this.dealerCredit = {
              creditLimit: limit,
              outstanding,
              available: limit - outstanding,
              utilization: credit.utilizationPercent ?? (limit ? Math.round(outstanding / limit * 100) : 0)
            };
            // Patch the row in allDealers so the table also reflects the new limit
            const dealerRow = this.allDealers.find(d => this.getDealerFinancialId(d) === dealerFinancialId);
            if (dealerRow) {
              dealerRow.creditLimit = limit;
            }
            // Patch viewingDealer in-place (keep same reference for Angular change detection)
            if (this.viewingDealer && this.getDealerFinancialId(this.viewingDealer) === dealerFinancialId) {
              this.viewingDealer.creditLimit = limit;
            }
            // Re-derive filtered list to push changes to the data-table
            this.applyFilters();
          },
          error: () => {
            // Even if re-fetch fails, set credit optimistically
            this.dealerCredit = {
              creditLimit: newLimit,
              outstanding: this.dealerCredit?.outstanding || 0,
              available: newLimit - (this.dealerCredit?.outstanding || 0),
              utilization: newLimit ? Math.round((this.dealerCredit?.outstanding || 0) / newLimit * 100) : 0
            };
          }
        });
      },
      error: err => {
        this.toast.error(err.error?.error || 'Failed to update purchase limit');
        this.savingCredit = false;
      }
    });
  }

  formatNum(val: number): string { return val ? val.toLocaleString('en-IN') : '0'; }

  private getDealerFinancialId(dealer: any): string {
    return dealer?.dealerProfileId || dealer?.userId;
  }

  private trustSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
