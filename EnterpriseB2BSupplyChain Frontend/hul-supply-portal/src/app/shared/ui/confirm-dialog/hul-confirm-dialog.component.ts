import { Component, OnInit, OnDestroy } from '@angular/core';
import { HulConfirmService, ConfirmConfig } from './hul-confirm.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'hul-confirm-dialog',
  standalone: false,
  template: `
    <div *ngIf="visible" class="confirm-overlay" (click)="onCancel()">
      <div class="confirm-dialog" [class]="'confirm-dialog--' + config.variant" (click)="$event.stopPropagation()">
        <div class="confirm-dialog__icon">
          <svg *ngIf="config.variant === 'danger'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg *ngIf="config.variant === 'warning'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg *ngIf="config.variant === 'info'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <h3 class="confirm-dialog__title">{{ config.title }}</h3>
        <p class="confirm-dialog__message">{{ config.message }}</p>
        <div class="confirm-dialog__actions">
          <button class="confirm-dialog__btn confirm-dialog__btn--cancel" (click)="onCancel()">{{ config.cancelLabel || 'Cancel' }}</button>
          <button class="confirm-dialog__btn confirm-dialog__btn--confirm confirm-dialog__btn--{{ config.variant }}" (click)="onConfirm()">{{ config.confirmLabel || 'Confirm' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 9999;
      animation: fadeIn 150ms var(--ease-out);
    }
    .confirm-dialog {
      background: var(--bg-card); border-radius: var(--radius-xl); padding: 28px;
      max-width: 400px; width: 90%; text-align: center; box-shadow: var(--shadow-xl);
      animation: dialogEnter 180ms var(--ease-out);
    }
    .confirm-dialog__icon { margin-bottom: 12px; }
    .confirm-dialog--danger .confirm-dialog__icon { color: var(--hul-danger); }
    .confirm-dialog--warning .confirm-dialog__icon { color: var(--hul-warning); }
    .confirm-dialog--info .confirm-dialog__icon { color: var(--hul-primary); }
    .confirm-dialog__title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; font-family: var(--font-display); }
    .confirm-dialog__message { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; line-height: 1.5; }
    .confirm-dialog__actions { display: flex; gap: 12px; justify-content: center; }
    .confirm-dialog__btn {
      padding: 10px 24px; border-radius: var(--radius-lg); font-size: 14px; font-weight: 600;
      font-family: var(--font-body); cursor: pointer; border: 1px solid var(--border-default);
      transition: all var(--duration-fast) var(--ease-out);
    }
    .confirm-dialog__btn--cancel { background: transparent; color: var(--text-secondary); }
    .confirm-dialog__btn--cancel:hover { background: var(--bg-muted); }
    .confirm-dialog__btn--confirm { border: none; color: white; }
    .confirm-dialog__btn--danger { background: var(--hul-danger); }
    .confirm-dialog__btn--danger:hover { background: #dc2626; }
    .confirm-dialog__btn--warning { background: var(--hul-warning); color: #1e293b; }
    .confirm-dialog__btn--warning:hover { background: #d97706; }
    .confirm-dialog__btn--info { background: var(--hul-primary); }
    .confirm-dialog__btn--info:hover { background: var(--hul-primary-hover); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dialogEnter { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class HulConfirmDialogComponent implements OnInit, OnDestroy {
  visible = false;
  config: ConfirmConfig = { title: '', message: '', variant: 'info' };
  private sub!: Subscription;

  constructor(private confirmService: HulConfirmService) {}

  ngOnInit(): void {
    this.sub = this.confirmService.dialogState$.subscribe(state => {
      if (state.config) this.config = state.config;
      this.visible = state.isOpen;
    });
  }

  ngOnDestroy(): void { 
    this.confirmService.resolve(false);
    this.sub?.unsubscribe(); 
  }

  onConfirm(): void { this.confirmService.resolve(true); }
  onCancel(): void { this.confirmService.resolve(false); }
}
