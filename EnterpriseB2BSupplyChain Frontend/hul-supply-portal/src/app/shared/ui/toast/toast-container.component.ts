import { Component } from '@angular/core';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'hul-toast-container',
  standalone: false,
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of (toastService.toasts | async)"
           class="toast toast--{{ toast.type }}"
           [class.toast--dismissing]="toast.dismissing">
        <div class="toast__icon">
          <svg *ngIf="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <svg *ngIf="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg *ngIf="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg *ngIf="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__dismiss" (click)="dismiss(toast.id)" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 420px;
      width: 100%;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      animation: slideInRight 300ms var(--ease-out);
      pointer-events: all;
      backdrop-filter: blur(8px);
      border: 1px solid var(--border-default);
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .toast--dismissing {
      animation: slideOutRight 300ms var(--ease-out) forwards;
    }

    .toast--success .toast__icon { color: var(--hul-success); }
    .toast--error .toast__icon { color: var(--hul-danger); }
    .toast--warning .toast__icon { color: var(--hul-warning); }
    .toast--info .toast__icon { color: var(--hul-info); }

    .toast__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .toast__message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
      font-family: var(--font-body);
    }

    .toast__dismiss {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 4px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      transition: color var(--duration-fast) var(--ease-out),
                  background var(--duration-fast) var(--ease-out);
    }

    .toast__dismiss:hover {
      color: var(--text-primary);
      background: var(--bg-muted);
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideOutRight {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(20px); }
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
