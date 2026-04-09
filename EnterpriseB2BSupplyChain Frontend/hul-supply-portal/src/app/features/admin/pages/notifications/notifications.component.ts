import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DataTableColumn, DataTableAction } from '../../../../shared/ui/data-table/hul-data-table.component';

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  'OrderPlaced': ['dealer_name', 'order_number', 'total_amount', 'order_date', 'item_count'],
  'OrderConfirmed': ['dealer_name', 'order_number', 'total_amount', 'estimated_delivery'],
  'AgentAssigned': ['dealer_name', 'order_number', 'agent_name', 'agent_phone', 'vehicle_no', 'estimated_arrival'],
  'InvoiceGenerated': ['dealer_name', 'invoice_number', 'grand_total', 'order_number', 'due_date', 'payment_link'],
  'PaymentReceived': ['dealer_name', 'invoice_number', 'amount_paid', 'payment_method', 'transaction_id', 'remaining_balance'],
  'SLAAtRisk': ['dealer_name', 'order_number', 'sla_deadline', 'hours_remaining', 'current_status'],
  'OrderCancelled': ['dealer_name', 'order_number', 'reason', 'refund_amount', 'cancellation_date'],
  'OrderDelivered': ['dealer_name', 'order_number', 'delivery_date', 'agent_name', 'total_amount'],
  'StockRestored': ['dealer_name', 'product_name', 'sku', 'available_qty', 'restock_date'],
  'LowStockAlert': ['product_name', 'sku', 'current_stock', 'min_threshold', 'category'],
  'DealerApproved': ['dealer_name', 'company_name', 'login_link', 'credit_limit'],
  'DealerRejected': ['dealer_name', 'reason', 'support_email'],
  'DealerSuspended': ['dealer_name', 'reason', 'suspension_date', 'support_email'],
  'CreditLimitUpdated': ['dealer_name', 'old_limit', 'new_limit', 'outstanding', 'available_credit'],
  'ReturnApproved': ['dealer_name', 'order_number', 'return_id', 'refund_amount', 'return_reason'],
  'ReturnRejected': ['dealer_name', 'order_number', 'return_id', 'rejection_reason'],
  'ShipmentDispatched': ['dealer_name', 'order_number', 'tracking_id', 'vehicle_no', 'estimated_delivery'],
  'PasswordReset': ['dealer_name', 'reset_link', 'expiry_time'],
  'WelcomeDealer': ['dealer_name', 'company_name', 'login_link', 'support_email'],
  'MonthlyStatement': ['dealer_name', 'month', 'total_orders', 'total_amount', 'total_paid', 'outstanding'],
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  'OrderPlaced': 'Sent when a dealer places a new order',
  'OrderConfirmed': 'Sent when an admin approves/confirms an order',
  'AgentAssigned': 'Sent when a delivery agent is assigned to a shipment',
  'InvoiceGenerated': 'Sent when an invoice is generated for an order',
  'PaymentReceived': 'Sent when a payment is successfully received',
  'SLAAtRisk': 'Sent when an order is at risk of breaching SLA',
  'OrderCancelled': 'Sent when an order is cancelled',
  'OrderDelivered': 'Sent when an order is marked as delivered',
  'StockRestored': 'Sent when a previously out-of-stock product is restocked',
  'LowStockAlert': 'Internal alert when a product falls below minimum threshold',
  'DealerApproved': 'Sent when a dealer registration is approved',
  'DealerRejected': 'Sent when a dealer registration is rejected',
  'DealerSuspended': 'Sent when a dealer account is suspended',
  'CreditLimitUpdated': 'Sent when a dealer credit limit is changed',
  'ReturnApproved': 'Sent when a return request is approved',
  'ReturnRejected': 'Sent when a return request is rejected',
  'ShipmentDispatched': 'Sent when a shipment is dispatched for delivery',
  'PasswordReset': 'Sent when a password reset is requested',
  'WelcomeDealer': 'Sent to newly registered dealers as a welcome message',
  'MonthlyStatement': 'Monthly account statement sent to all active dealers',
};

@Component({
  selector: 'app-notifications', standalone: false,
  template: `
    <div class="page-container">
      <hul-page-header title="Email Templates" subtitle="Manage notification templates for all system events"></hul-page-header>

      <!-- Stats -->
      <div class="tmpl-stats">
        <div class="tmpl-stat">
          <span class="tmpl-stat__value">{{ templates.length }}</span>
          <span class="tmpl-stat__label">Total Templates</span>
        </div>
        <div class="tmpl-stat">
          <span class="tmpl-stat__value" style="color:#059669">{{ activeTemplates }}</span>
          <span class="tmpl-stat__label">Active</span>
        </div>
        <div class="tmpl-stat">
          <span class="tmpl-stat__value" style="color:var(--text-tertiary)">{{ templates.length - activeTemplates }}</span>
          <span class="tmpl-stat__label">Inactive</span>
        </div>
        <div class="tmpl-stat">
          <span class="tmpl-stat__value" style="color:#7c3aed">{{ allEventTypes.length }}</span>
          <span class="tmpl-stat__label">Event Types</span>
        </div>
      </div>

      <hul-data-table [columns]="columns" [data]="templates" [loading]="loading" [totalCount]="templates.length"
        [currentPage]="1" [pageSize]="50" emptyMessage="No templates found" searchPlaceholder="Search templates..."
        [actions]="tableActions" (rowAction)="onAction($event)" (searchChange)="onSearch($event)">
      </hul-data-table>

      <hul-modal *ngIf="showModal" [open]="showModal" [title]="'Edit Template — ' + editTemplate?.eventType" size="xl" (close)="showModal = false">
        <div class="template-form">
          <!-- Event description -->
          <div class="event-desc" *ngIf="getDescription(editTemplate?.eventType)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {{ getDescription(editTemplate?.eventType) }}
          </div>

          <div class="template-form__grid">
            <div class="form-group">
              <label>Subject</label>
              <input #subjectInput type="text" [(ngModel)]="editSubject" class="form-input" (focus)="activeEditor = 'subject'" />
            </div>
            <div class="vars-panel">
              <strong>Template variables</strong>
              <p>Click a variable to insert it into the active field.</p>
              <div class="vars-list">
                <button *ngFor="let v of getVars(editTemplate?.eventType)" type="button" class="vars-chip" (click)="insertVariable(v)">{{'{{ ' + v + ' }}'}}</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>HTML Body</label>
            <textarea #bodyInput [(ngModel)]="editBody" class="form-input form-input--mono" rows="14" (focus)="activeEditor = 'body'"></textarea>
          </div>

          <div class="vars-hint">
            <strong>Tip:</strong>
            <span>Variables are inserted at the cursor position. Use {{ '{{' }} variable_name {{ '}}' }} syntax in your HTML.</span>
          </div>

          <div class="form-actions">
            <button class="btn btn--ghost" (click)="showModal = false">Cancel</button>
            <button class="btn btn--primary" (click)="saveTemplate()">Save Template</button>
          </div>
        </div>
      </hul-modal>
    </div>
  `,
  styles: [`
    .tmpl-stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .tmpl-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 24px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-default); box-shadow: var(--shadow-card); min-width: 100px; }
    .tmpl-stat__value { font-size: 22px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .tmpl-stat__label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }

    .event-desc { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bg-subtle); border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); border: 1px solid var(--border-default); margin-bottom: 8px; }

    .template-form { display: flex; flex-direction: column; gap: 16px; min-height: 600px; }
    .template-form__grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 16px; align-items: start; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .form-input--mono { font-family: var(--font-mono); font-size: 13px; min-height: 320px; resize: none; }
    .vars-panel { border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-subtle); padding: 16px; display: flex; flex-direction: column; gap: 10px; min-height: 100%; }
    .vars-panel strong { font-size: 14px; color: var(--text-primary); }
    .vars-panel p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .vars-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .vars-chip { padding: 6px 10px; border: 1px solid var(--border-default); border-radius: 9999px; background: var(--bg-card); color: var(--hul-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
    .vars-chip:hover { border-color: var(--hul-primary); background: var(--hul-primary-light); }
    .vars-hint { padding: 12px; background: var(--bg-muted); border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--primary { background: var(--hul-primary); color: white; }
    @media (max-width: 900px) {
      .template-form__grid { grid-template-columns: 1fr; }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  @ViewChild('subjectInput') subjectInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bodyInput') bodyInput?: ElementRef<HTMLTextAreaElement>;

  loading = true;
  templates: any[] = [];
  allTemplates: any[] = [];
  showModal = false;
  editTemplate: any = null;
  editSubject = '';
  editBody = '';
  activeEditor: 'subject' | 'body' = 'body';
  activeTemplates = 0;
  allEventTypes = Object.keys(TEMPLATE_VARIABLES);

  columns: DataTableColumn[] = [
    { key: 'eventType', label: 'Event Type', type: 'text', sortable: true },
    { key: 'subject', label: 'Subject', type: 'text' },
    { key: 'isActive', label: 'Active', type: 'boolean' },
    { key: 'updatedAt', label: 'Last Updated', type: 'date' },
    { key: 'actions', label: 'Actions', type: 'actions-menu' },
  ];

  tableActions: DataTableAction[] = [{ key: 'edit', label: 'Edit Template' }];

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(API_ENDPOINTS.notification.templates()).subscribe({
      next: templates => {
        this.allTemplates = templates;
        this.templates = templates;
        this.activeTemplates = templates.filter(t => t.isActive).length;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onSearch(term: string): void {
    if (!term) {
      this.templates = [...this.allTemplates];
      return;
    }
    const s = term.toLowerCase();
    this.templates = this.allTemplates.filter(t =>
      t.eventType?.toLowerCase().includes(s) || t.subject?.toLowerCase().includes(s)
    );
  }

  onAction(e: any): void {
    if (e.action === 'edit') {
      this.editTemplate = e.row;
      this.editSubject = e.row.subject || '';
      this.editBody = e.row.htmlBody || '';
      this.activeEditor = 'body';
      this.showModal = true;
    }
  }

  getVars(eventType: string): string[] { return TEMPLATE_VARIABLES[eventType] || []; }
  getDescription(eventType: string): string { return EVENT_DESCRIPTIONS[eventType] || ''; }

  insertVariable(variable: string): void {
    const token = `{{ ${variable} }}`;
    const target = this.activeEditor === 'subject' ? this.subjectInput?.nativeElement : this.bodyInput?.nativeElement;
    if (!target) return;

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const nextValue = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`;

    if (this.activeEditor === 'subject') {
      this.editSubject = nextValue;
    } else {
      this.editBody = nextValue;
    }

    queueMicrotask(() => {
      target.focus();
      const caret = start + token.length;
      target.setSelectionRange(caret, caret);
    });
  }

  saveTemplate(): void {
    this.http.put(API_ENDPOINTS.notification.templateById(this.editTemplate.templateId), { subject: this.editSubject, htmlBody: this.editBody }).subscribe({
      next: () => {
        this.allTemplates = this.allTemplates.map(template =>
          template.templateId === this.editTemplate.templateId
            ? { ...template, subject: this.editSubject, htmlBody: this.editBody, updatedAt: new Date().toISOString() }
            : template
        );
        this.templates = [...this.allTemplates];
        this.toast.success('Template updated');
        this.showModal = false;
      },
      error: err => this.toast.error(err.error?.error || 'Failed to update')
    });
  }
}
