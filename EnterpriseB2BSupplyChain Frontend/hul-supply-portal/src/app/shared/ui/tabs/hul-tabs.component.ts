import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'hul-tabs',
  standalone: false,
  template: `
    <div class="tabs">
      <button *ngFor="let tab of tabs" class="tabs__item"
              [class.tabs__item--active]="activeTab === tab.value"
              (click)="onTabClick(tab.value)">
        {{ tab.label }}
        <span *ngIf="tab.count !== undefined && tab.count !== null" class="tabs__count">{{ tab.count }}</span>
      </button>
      <div class="tabs__indicator"></div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border-default); position: relative; overflow-x: auto; }
    .tabs__item {
      padding: 10px 20px; border: none; background: none; cursor: pointer;
      font-size: 14px; font-weight: 500; font-family: var(--font-body);
      color: var(--text-tertiary); white-space: nowrap; position: relative;
      transition: color var(--duration-fast) var(--ease-out);
    }
    .tabs__item:hover { color: var(--text-primary); }
    .tabs__item--active { color: var(--hul-primary); }
    .tabs__item--active::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
      height: 2px; background: var(--hul-primary); border-radius: 1px 1px 0 0;
      animation: tabSlide 200ms var(--ease-out);
    }
    .tabs__count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 6px; margin-left: 6px;
      background: var(--bg-muted); border-radius: 9999px; font-size: 11px; font-weight: 600;
      color: var(--text-tertiary);
    }
    .tabs__item--active .tabs__count { background: var(--hul-primary-light); color: var(--hul-primary); }
    @keyframes tabSlide { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  `]
})
export class HulTabsComponent {
  @Input() tabs: { label: string; value: string; count?: number }[] = [];
  @Input() activeTab = '';
  @Output() tabChange = new EventEmitter<string>();

  onTabClick(value: string): void {
    this.activeTab = value;
    this.tabChange.emit(value);
  }
}
