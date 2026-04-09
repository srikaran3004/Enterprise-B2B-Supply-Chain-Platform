import { Component, Input } from '@angular/core';

@Component({
  selector: 'hul-button',
  standalone: false,
  template: `
    <button
      [type]="type"
      [class]="getClasses()"
      [disabled]="disabled || loading"
      [style.width]="fullWidth ? '100%' : 'auto'"
      (click)="onClick($event)">
      <span *ngIf="loading" class="hul-btn__spinner">
        <svg class="spinner-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-dasharray="30 60" />
        </svg>
      </span>
      <span *ngIf="!loading && iconName" class="hul-btn__icon" [innerHTML]="getIconSvg()"></span>
      <span class="hul-btn__label" [class.sr-only]="loading && !showLabelOnLoading">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: [`
    :host { display: inline-block; }
    :host([fullWidth]) { display: block; width: 100%; }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: var(--font-body);
      font-weight: 600;
      border: none;
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: all var(--duration-base) var(--ease-out);
      position: relative;
      white-space: nowrap;
      line-height: 1;
    }

    button:active:not(:disabled) {
      transform: scale(0.97);
    }

    button:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Sizes */
    .hul-btn--sm { padding: 8px 14px; font-size: 13px; border-radius: var(--radius-md); }
    .hul-btn--md { padding: 10px 20px; font-size: 14px; border-radius: var(--radius-md); }
    .hul-btn--lg { padding: 14px 28px; font-size: 16px; border-radius: var(--radius-lg); }

    /* Variants */
    .hul-btn--primary {
      background: var(--hul-primary);
      color: var(--text-inverse);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
    }
    .hul-btn--primary:hover:not(:disabled) {
      background: var(--hul-primary-hover);
      box-shadow: 0 2px 8px rgb(3 105 161 / 0.3);
    }

    .hul-btn--secondary {
      background: var(--bg-muted);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
    }
    .hul-btn--secondary:hover:not(:disabled) {
      background: var(--hul-gray-200);
      border-color: var(--border-strong);
    }

    .hul-btn--ghost {
      background: transparent;
      color: var(--text-secondary);
    }
    .hul-btn--ghost:hover:not(:disabled) {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .hul-btn--danger {
      background: var(--hul-danger);
      color: var(--text-inverse);
    }
    .hul-btn--danger:hover:not(:disabled) {
      background: #dc2626;
      box-shadow: 0 2px 8px rgb(239 68 68 / 0.3);
    }

    .hul-btn--outline {
      background: transparent;
      color: var(--hul-primary);
      border: 1.5px solid var(--hul-primary);
    }
    .hul-btn--outline:hover:not(:disabled) {
      background: var(--hul-primary-light);
    }

    .hul-btn__spinner {
      display: flex;
      align-items: center;
    }

    .spinner-svg {
      animation: spin 0.8s linear infinite;
    }

    .hul-btn__icon {
      display: flex;
      align-items: center;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class HulButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() iconName = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() showLabelOnLoading = true;

  getClasses(): string {
    return `hul-btn--${this.variant} hul-btn--${this.size}`;
  }

  getIconSvg(): string {
    return '';
  }

  onClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
