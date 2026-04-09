import { Component, Input } from '@angular/core';

@Component({
  selector: 'hul-badge',
  standalone: false,
  template: `
    <span class="hul-badge" [ngClass]="'hul-badge--' + variant + ' hul-badge--' + size">
      <span *ngIf="dot" class="hul-badge__dot"></span>
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .hul-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 9999px;
      font-family: var(--font-body);
      font-weight: 600;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }

    .hul-badge--sm { padding: 2px 8px; font-size: 11px; }
    .hul-badge--md { padding: 4px 12px; font-size: 13px; }

    .hul-badge--success { background: #ecfdf5; color: #059669; }
    .hul-badge--warning { background: #fffbeb; color: #d97706; }
    .hul-badge--danger  { background: #fef2f2; color: #dc2626; }
    .hul-badge--info    { background: #eff6ff; color: #2563eb; }
    .hul-badge--neutral { background: var(--bg-muted); color: var(--text-tertiary); }
    .hul-badge--primary { background: var(--hul-primary-light); color: var(--hul-primary); }

    :host-context(.dark) .hul-badge--success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    :host-context(.dark) .hul-badge--warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    :host-context(.dark) .hul-badge--danger  { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    :host-context(.dark) .hul-badge--info    { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    :host-context(.dark) .hul-badge--neutral { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
    :host-context(.dark) .hul-badge--primary { background: rgba(3, 105, 161, 0.15); color: #38bdf8; }

    .hul-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.5); }
    }
  `]
})
export class HulBadgeComponent {
  @Input() variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' = 'neutral';
  @Input() size: 'sm' | 'md' = 'sm';
  @Input() dot = false;
}
