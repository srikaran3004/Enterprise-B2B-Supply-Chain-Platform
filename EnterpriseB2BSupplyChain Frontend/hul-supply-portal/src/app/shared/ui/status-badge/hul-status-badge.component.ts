import { Component, Input } from '@angular/core';
import { ORDER_STATUS_CONFIG } from '../../constants/order-status.constants';

@Component({
  selector: 'hul-status-badge',
  standalone: false,
  template: `
    <span class="status-badge" [ngClass]="status === 'Active' ? 'badge-active' : ''" [style.background]="status !== 'Active' ? config.bgColor : ''" [style.color]="status !== 'Active' ? config.color : ''">
      <span *ngIf="showDot" class="status-badge__dot" [style.background]="config.color"></span>
      {{ config.label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font-body);
      white-space: nowrap;
    }

    .status-badge__dot {
      width: 6px;
      height: 6px;
      min-width: 6px;
      min-height: 6px;
      flex-shrink: 0;
      border-radius: 50%;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.5); }
    }
  `]
})
export class HulStatusBadgeComponent {
  @Input() status = '';

  get config() {
    return ORDER_STATUS_CONFIG[this.status] || { label: this.status, color: '#64748b', bgColor: '#f8fafc', icon: 'circle', variant: 'neutral' };
  }

  get showDot(): boolean {
    return this.status === 'InTransit';
  }
}
