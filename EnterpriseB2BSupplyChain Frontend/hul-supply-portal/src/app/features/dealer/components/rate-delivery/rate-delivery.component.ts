import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-rate-delivery',
  standalone: false,
  template: `
    <hul-modal [isOpen]="isOpen" title="Rate Your Delivery" size="md" (closed)="onSkip()">
      <div class="rate-delivery">
        <!-- Order context -->
        <div class="rate-delivery__order" *ngIf="orderNumber">
          <span class="rate-delivery__order-label">Order</span>
          <span class="rate-delivery__order-num">{{ orderNumber }}</span>
        </div>

        <!-- Star Rating -->
        <div class="rate-delivery__prompt">How was your delivery experience?</div>
        <div class="rate-delivery__stars">
          <button *ngFor="let star of [1,2,3,4,5]" class="star-btn"
                  [class.star-btn--filled]="star <= selectedRating"
                  [class.star-btn--hover]="star <= hoverRating && hoverRating > 0"
                  (mouseenter)="hoverRating = star"
                  (mouseleave)="hoverRating = 0"
                  (click)="selectedRating = star">
            <svg width="36" height="36" viewBox="0 0 24 24"
                 [attr.fill]="star <= (hoverRating || selectedRating) ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>
        <div class="rate-delivery__label">{{ getRatingLabel() }}</div>

        <!-- Feedback -->
        <div class="rate-delivery__feedback" *ngIf="selectedRating > 0">
          <label class="feedback-label">Share your feedback <span class="optional">(optional)</span></label>
          <textarea
            [(ngModel)]="feedback"
            class="feedback-input"
            rows="3"
            maxlength="1000"
            [placeholder]="getFeedbackPlaceholder()"></textarea>
          <div class="feedback-counter">{{ feedback.length }}/1000</div>
        </div>
      </div>

      <div modal-footer class="rate-delivery__actions">
        <button class="btn btn--ghost" (click)="onSkip()">Skip</button>
        <button class="btn btn--primary" [disabled]="selectedRating === 0 || submitting" (click)="submitRating()">
          <span *ngIf="!submitting">Submit Rating</span>
          <span *ngIf="submitting" class="spinner-wrap">
            <span class="spinner"></span> Submitting...
          </span>
        </button>
      </div>
    </hul-modal>
  `,
  styles: [`
    .rate-delivery { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; }

    .rate-delivery__order {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 9999px;
      background: var(--bg-muted); font-size: 13px;
    }
    .rate-delivery__order-label { color: var(--text-tertiary); font-weight: 500; }
    .rate-delivery__order-num { font-family: var(--font-mono); font-weight: 700; color: var(--hul-primary); }

    .rate-delivery__prompt {
      font-family: var(--font-display); font-size: 18px;
      font-weight: 600; color: var(--text-primary); text-align: center;
    }

    .rate-delivery__stars { display: flex; gap: 8px; justify-content: center; margin: 8px 0; }
    .star-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      color: #d1d5db; transition: all 150ms var(--ease-out);
      border-radius: var(--radius-md);
    }
    .star-btn:hover { transform: scale(1.15); }
    .star-btn--filled { color: #f59e0b; }
    .star-btn--hover { color: #fbbf24; transform: scale(1.1); }

    .rate-delivery__label {
      font-size: 14px; font-weight: 500; color: var(--text-secondary);
      min-height: 20px; text-align: center;
    }

    .rate-delivery__feedback { width: 100%; animation: fadeIn 200ms var(--ease-out); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .feedback-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
    .optional { font-weight: 400; color: var(--text-tertiary); }
    .feedback-input {
      width: 100%; padding: 12px 14px;
      border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-card); color: var(--text-primary);
      font-family: var(--font-body); font-size: 14px;
      resize: vertical; min-height: 80px; box-sizing: border-box;
      transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
    }
    .feedback-input:focus {
      outline: none; border-color: var(--hul-primary);
      box-shadow: 0 0 0 3px var(--hul-primary-light);
    }
    .feedback-input::placeholder { color: var(--text-disabled); }
    .feedback-counter { text-align: right; font-size: 11px; color: var(--text-disabled); margin-top: 4px; }

    .rate-delivery__actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn {
      padding: 10px 24px; border-radius: var(--radius-lg);
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; font-family: var(--font-body);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .btn--ghost { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
    .btn--ghost:hover { background: var(--bg-muted); color: var(--text-primary); }
    .btn--primary {
      background: var(--hul-primary); color: white;
      min-width: 150px; display: inline-flex;
      align-items: center; justify-content: center; gap: 8px;
    }
    .btn--primary:hover:not(:disabled) { background: var(--hul-primary-hover); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .spinner-wrap { display: inline-flex; align-items: center; gap: 8px; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: white; border-radius: 50%;
      animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class RateDeliveryComponent {
  @Input() isOpen = false;
  @Input() shipmentId = '';
  @Input() orderNumber = '';
  @Output() closed = new EventEmitter<void>();
  @Output() rated = new EventEmitter<{ shipmentId: string; rating: number }>();

  selectedRating = 0;
  hoverRating = 0;
  feedback = '';
  submitting = false;

  constructor(private http: ZoneHttpService, private toast: ToastService) {}

  getRatingLabel(): string {
    const rating = this.hoverRating || this.selectedRating;
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Below Average';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Tap a star to rate';
    }
  }

  getFeedbackPlaceholder(): string {
    if (this.selectedRating <= 2) return 'What went wrong? Help us improve...';
    if (this.selectedRating <= 4) return 'What could we do better?';
    return 'Glad you had a great experience! Tell us more...';
  }

  submitRating(): void {
    if (this.selectedRating === 0 || !this.shipmentId) return;
    this.submitting = true;

    this.http.post(API_ENDPOINTS.logistics.rateShipment(this.shipmentId), {
      rating: this.selectedRating,
      feedback: this.feedback.trim() || null
    }).subscribe({
      next: () => {
        this.toast.success('Thank you for your feedback!');
        this.rated.emit({ shipmentId: this.shipmentId, rating: this.selectedRating });
        this.resetAndClose();
      },
      error: err => {
        this.toast.error(err.error?.error || err.error?.message || 'Failed to submit rating');
        this.submitting = false;
      }
    });
  }

  onSkip(): void {
    this.resetAndClose();
  }

  private resetAndClose(): void {
    this.selectedRating = 0;
    this.hoverRating = 0;
    this.feedback = '';
    this.submitting = false;
    this.isOpen = false;
    this.closed.emit();
  }
}
