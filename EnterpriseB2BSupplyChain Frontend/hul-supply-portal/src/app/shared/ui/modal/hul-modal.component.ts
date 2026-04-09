import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Component({
  selector: 'hul-modal',
  standalone: false,
  template: `
    <div class="modal-backdrop" *ngIf="isOpen" (click)="onBackdropClick()">
      <div class="modal" [ngClass]="'modal--' + size" (click)="$event.stopPropagation()">
        <div class="modal__header" *ngIf="title || closable">
          <h3 class="modal__title">{{ title }}</h3>
          <button *ngIf="closable" class="modal__close" (click)="close()" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal__body">
          <ng-content></ng-content>
        </div>
        <div class="modal__footer">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: var(--bg-overlay);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9000;
      padding: 24px;
      overflow: auto;
      animation: fadeIn 200ms var(--ease-out);
    }

    .modal {
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      max-height: min(85vh, 920px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalEnter 180ms var(--ease-out);
      width: min(var(--modal-width), calc(100vw - 48px));
      min-width: min(var(--modal-width), calc(100vw - 48px));
      min-height: var(--modal-min-height);
      max-width: calc(100vw - 48px);
      box-sizing: border-box;
    }

    .modal--sm { --modal-width: 420px; --modal-min-height: 280px; }
    .modal--md { --modal-width: 560px; --modal-min-height: 340px; }
    .modal--lg { --modal-width: 760px; --modal-min-height: 500px; }
    .modal--xl { --modal-width: 920px; --modal-min-height: 620px; }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }

    .modal__title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .modal__close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 6px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .modal__close:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .modal__body {
      padding: 20px 24px;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-gutter: stable both-edges;
    }

    .modal__footer {
      padding: 0 24px 20px;
    }

    .modal__footer:empty {
      display: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalEnter {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 640px) {
      .modal-backdrop { padding: 16px; }
      .modal {
        min-width: 0;
        min-height: auto;
        max-height: calc(100vh - 32px);
      }
      .modal__header,
      .modal__body,
      .modal__footer {
        padding-left: 18px;
        padding-right: 18px;
      }
    }
  `]
})
export class HulModalComponent {
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() closable = true;
  @Input() isOpen = false;
  @Input() set open(val: boolean) { this.isOpen = val; }
  @Output() closed = new EventEmitter<void>();
  @Output('close') closeAlias = this.closed;

  @HostListener('document:keydown.escape')
  onEscKey() {
    if (this.closable && this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.closable) {
      this.close();
    }
  }
}
