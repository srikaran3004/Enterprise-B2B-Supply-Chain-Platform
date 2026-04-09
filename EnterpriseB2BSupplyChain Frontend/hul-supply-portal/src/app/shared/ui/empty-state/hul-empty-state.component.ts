import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'hul-empty-state',
  standalone: false,
  template: `
    <div class="empty-state">
      <div class="empty-state__icon">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <ng-container [ngSwitch]="icon">
            <ng-container *ngSwitchCase="'shopping-bag'"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></ng-container>
            <ng-container *ngSwitchCase="'package'"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></ng-container>
            <ng-container *ngSwitchCase="'receipt'"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></ng-container>
            <ng-container *ngSwitchCase="'search'"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></ng-container>
            <ng-container *ngSwitchDefault><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></ng-container>
          </ng-container>
        </svg>
      </div>
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__description">{{ description }}</p>
      <button *ngIf="actionLabel" class="empty-state__action" (click)="action.emit()">
        {{ actionLabel }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      text-align: center;
    }

    .empty-state__icon {
      color: var(--text-disabled);
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-state__title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .empty-state__description {
      font-size: 14px;
      color: var(--text-tertiary);
      max-width: 360px;
      margin: 0 0 20px;
      line-height: 1.5;
    }

    .empty-state__action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: var(--hul-primary);
      color: var(--text-inverse);
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      font-family: var(--font-body);
      cursor: pointer;
      transition: all var(--duration-base) var(--ease-out);
    }

    .empty-state__action:hover {
      background: var(--hul-primary-hover);
      box-shadow: 0 2px 8px rgba(3, 105, 161, 0.3);
    }
  `]
})
export class HulEmptyStateComponent {
  @Input() icon = 'info';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
