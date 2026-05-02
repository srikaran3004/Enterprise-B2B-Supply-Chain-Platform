import { Component, OnInit, inject } from '@angular/core';
import { map } from 'rxjs';
import { ReturnsService, ReturnRequest } from '../../../../core/services/returns.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-returns',
  standalone: false,
  template: `
<div class="returns-page">
  <hul-page-header title="My Returns" subtitle="Track and manage your return requests"
    [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Returns'}]">
  </hul-page-header>

  <!-- Eligible Orders for Return -->
  <hul-card *ngIf="myOrders.length > 0" style="margin-bottom: 20px;">
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary);">Eligible Orders for Return</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;">
        <div *ngFor="let order of myOrders" class="order-card" (click)="openRaiseReturnModal(order)">
          <div class="order-card__header">
            <span class="order-number">{{ order.orderNumber }}</span>
            <span class="order-date">{{ order.placedAt | date:'mediumDate' }}</span>
          </div>
          <div class="order-card__body">
            <span class="order-amount">{{ order.totalAmount | inrCurrency }}</span>
            <span class="order-items">{{ order.totalItems }} items</span>
          </div>
          <button class="return-btn">Request Return</button>
        </div>
      </div>
    </div>
  </hul-card>

  <!-- Return Requests -->
  <hul-card>
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary);">My Return Requests</h3>

      <hul-skeleton *ngIf="loading" type="text" [count]="3"></hul-skeleton>

      <div *ngIf="!loading && returns.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h4>No Returns Found</h4>
        <p>You haven't requested any order returns yet.</p>
      </div>

      <div class="returns-list" *ngIf="!loading && returns.length > 0">
        <div *ngFor="let ret of returns" class="return-item">
          <div class="return-item__header">
            <div>
              <span class="return-order">Order: {{ ret.orderId.substring(0,8).toUpperCase() }}</span>
              <span class="return-date">{{ ret.requestedAt | date:'medium' }}</span>
            </div>
            <hul-status-badge [status]="ret.status"></hul-status-badge>
          </div>
          <div class="return-item__body">
            <div class="return-reason"><strong>Reason:</strong> {{ ret.reason }}</div>
            <div *ngIf="ret.photoUrl" class="return-image">
              <img [src]="ret.photoUrl" alt="Return proof" (click)="openImage(ret.photoUrl)" />
              <span class="image-hint">Click to enlarge</span>
            </div>
            <div *ngIf="ret.adminNotes" class="admin-notes">
              <strong>Admin Note:</strong> {{ ret.adminNotes }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </hul-card>

  <!-- Raise Return Modal -->
  <hul-modal *ngIf="showRaiseReturnModal" [open]="showRaiseReturnModal" title="Request Return" size="md" (close)="showRaiseReturnModal = false">
    <div class="return-form" *ngIf="selectedOrder">
      <div class="order-info">
        <h4>Order Details</h4>
        <div class="info-row"><span>Order Number:</span><strong>{{ selectedOrder.orderNumber }}</strong></div>
        <div class="info-row"><span>Order Date:</span><strong>{{ selectedOrder.placedAt | date:'mediumDate' }}</strong></div>
        <div class="info-row"><span>Total Amount:</span><strong>{{ selectedOrder.totalAmount | inrCurrency }}</strong></div>
      </div>

      <div class="form-group">
        <label>Return Reason *</label>
        <textarea [(ngModel)]="returnReason" rows="4"
          placeholder="Please describe the reason for return (e.g., damaged product, wrong item received, quality issues)"
          class="form-input"></textarea>
      </div>

      <div class="form-group">
        <label>Proof Image (Optional)</label>
        <div class="file-upload">
          <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" style="display: none;" />
          <button *ngIf="!imagePreview" class="upload-btn" (click)="fileInput.click()" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Upload Image
          </button>
          <div *ngIf="imagePreview" class="image-preview">
            <img [src]="imagePreview" alt="Preview" />
            <button class="remove-btn" (click)="removeImage()" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <span class="help-text">Optional: Upload a clear image showing the issue (Max 5MB, JPG/PNG)</span>
      </div>

      <div class="form-actions">
        <button class="btn btn--ghost" (click)="showRaiseReturnModal = false" [disabled]="submittingReturn">Cancel</button>
        <button class="btn btn--primary" (click)="submitReturn()"
          [disabled]="!returnReason.trim() || submittingReturn">
          {{ submittingReturn ? 'Submitting...' : 'Submit Return Request' }}
        </button>
      </div>
    </div>
  </hul-modal>
</div>
  `,
  styles: [`
    .returns-page { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    
    .order-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: all var(--duration-fast); }
    .order-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .order-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-number { font-size: 14px; font-weight: 600; color: var(--hul-primary); }
    .order-date { font-size: 12px; color: var(--text-tertiary); }
    .order-card__body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .order-amount { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .order-items { font-size: 13px; color: var(--text-secondary); }
    .return-btn { width: 100%; padding: 8px; background: var(--hul-primary); color: white; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 600; cursor: pointer; transition: background var(--duration-fast); }
    .return-btn:hover { background: var(--hul-primary-hover); }
    
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-state h4 { margin: 12px 0 4px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .empty-state p { margin: 0; font-size: 14px; color: var(--text-secondary); }
    
    .returns-list { display: flex; flex-direction: column; gap: 12px; }
    .return-item { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; }
    .return-item__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .return-order { display: block; font-size: 14px; font-weight: 600; color: var(--hul-primary); margin-bottom: 4px; }
    .return-date { display: block; font-size: 12px; color: var(--text-tertiary); }
    .return-item__body { display: flex; flex-direction: column; gap: 12px; }
    .return-reason { font-size: 14px; color: var(--text-primary); }
    .return-image { position: relative; max-width: 200px; }
    .return-image img { width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-default); cursor: pointer; transition: transform var(--duration-fast); }
    .return-image img:hover { transform: scale(1.05); }
    .image-hint { display: block; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
    .admin-notes { padding: 12px; background: var(--bg-muted); border-radius: var(--radius-md); font-size: 13px; color: var(--text-secondary); border-left: 3px solid var(--hul-primary); }
    
    .return-form { padding: 8px 0; }
    .order-info { background: var(--bg-muted); padding: 16px; border-radius: var(--radius-lg); margin-bottom: 20px; }
    .order-info h4 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .info-row span { color: var(--text-tertiary); }
    .info-row strong { color: var(--text-primary); }
    
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-lg); background: var(--bg-card); color: var(--text-primary); font-family: var(--font-body); font-size: 14px; box-sizing: border-box; resize: vertical; }
    .form-input:focus { outline: none; border-color: var(--hul-primary); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    
    .file-upload { margin-bottom: 8px; }
    .upload-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--bg-muted); border: 2px dashed var(--border-default); border-radius: var(--radius-lg); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all var(--duration-fast); width: 100%; justify-content: center; }
    .upload-btn:hover { border-color: var(--hul-primary); color: var(--hul-primary); background: var(--hul-primary-light); }
    .image-preview { position: relative; max-width: 300px; }
    .image-preview img { width: 100%; border-radius: var(--radius-lg); border: 1px solid var(--border-default); }
    .remove-btn { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; background: var(--hul-danger); color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform var(--duration-fast); }
    .remove-btn:hover { transform: scale(1.1); }
    .help-text { display: block; font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
    
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
    .btn { padding: 10px 20px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); transition: all var(--duration-fast); }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); }
    .btn--primary { background: var(--hul-primary); color: white; }
    .btn--primary:hover { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class ReturnsComponent implements OnInit {
  private static readonly RETURN_WINDOW_MS = 48 * 60 * 60 * 1000;
  private returnsService = inject(ReturnsService);
  private http = inject(ZoneHttpService);
  private toast = inject(ToastService);

  returns: ReturnRequest[] = [];
  loading = true;
  myOrders: any[] = [];
  loadingOrders = false;

  // Modal state
  showRaiseReturnModal = false;
  selectedOrder: any = null;
  returnReason = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadingImage = false;
  submittingReturn = false;

  ngOnInit(): void {
    // loadReturns() internally calls loadMyOrders() on success,
    // so we must NOT call loadMyOrders() here to avoid a double API call
    // and to ensure orders are filtered against already-loaded return data.
    this.loadReturns();
  }

  loadReturns() {
    this.loading = true;
    this.returnsService.getMyReturns().subscribe({
      next: (data) => {
        this.returns = data;
        this.loading = false;
        this.loadMyOrders();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadMyOrders() {
    this.loadingOrders = true;
    this.http.get<any>(API_ENDPOINTS.orders.myOrders() + '?pageSize=100').subscribe({
      next: (response: any) => {
        const allOrders = response.items || response.Items || [];

        if (!Array.isArray(allOrders) || allOrders.length === 0) {
          this.myOrders = [];
          this.loadingOrders = false;
          return;
        }

        const now = Date.now();
        this.myOrders = allOrders.filter((order: any) =>
          order?.status === 'Delivered' &&
          this.isWithinReturnWindow(order?.deliveredAt, now) &&
          !this.returns.some(r => r.orderId === order.orderId)
        );
        this.loadingOrders = false;
      },
      error: () => {
        this.loadingOrders = false;
      }
    });
  }

  openRaiseReturnModal(order: any) {
    this.selectedOrder = order;
    this.returnReason = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.showRaiseReturnModal = true;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('Image size must be less than 5MB');
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  async submitReturn() {
    if (!this.selectedOrder || !this.returnReason.trim()) {
      this.toast.error('Please provide a return reason');
      return;
    }

    this.submittingReturn = true;

    try {
      let photoUrl = '';
      let thumbUrl = '';
      if (this.selectedFile) {
        const formData = new FormData();
        formData.append('file', this.selectedFile);

        const uploadResponse = await this.http.post<{ url: string; thumbUrl: string }>(
          API_ENDPOINTS.orders.uploadReturnImage(),
          formData,
          { headers: { 'X-Skip-Error-Toast': '1' } }
        ).toPromise();

        photoUrl = uploadResponse?.url || '';
        thumbUrl = uploadResponse?.thumbUrl || '';
      }

      // Submit return request
      await this.returnsService
        .raiseReturn(this.selectedOrder.orderId, this.returnReason, photoUrl, thumbUrl)
        .toPromise();

      this.toast.success('Return request submitted successfully');
      this.showRaiseReturnModal = false;
      this.loadReturns();
      this.loadMyOrders();
    } catch (error: any) {
      const message = this.extractErrorMessage(error);
      this.toast.error(message);
    } finally {
      this.submittingReturn = false;
    }
  }

  private extractErrorMessage(error: any): string {
    const payload = error?.error;

    if (!payload) {
      return 'Failed to submit return request';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (typeof payload.Message === 'string') {
      return payload.Message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }

    if (typeof payload.error?.message === 'string') {
      return payload.error.message;
    }

    return 'Failed to submit return request';
  }


  openImage(url: string) {
    window.open(url, '_blank');
  }

  private isWithinReturnWindow(deliveredAt: unknown, now = Date.now()): boolean {
    if (typeof deliveredAt !== 'string' || !deliveredAt.trim()) {
      return false;
    }

    const deliveredMs = new Date(deliveredAt).getTime();
    if (!Number.isFinite(deliveredMs) || deliveredMs > now) {
      return false;
    }

    return (now - deliveredMs) <= ReturnsComponent.RETURN_WINDOW_MS;
  }


}
