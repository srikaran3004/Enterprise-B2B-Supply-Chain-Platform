import { Component, Input } from '@angular/core';

@Component({
  selector: 'hul-stat-card',
  standalone: false,
  template: `
    <div class="stat-card" [class.stat-card--loading]="loading">
      <ng-container *ngIf="!loading">
        <div class="stat-card__icon stat-card__icon--{{ iconColor }}">
          <svg *ngIf="icon === 'user-clock'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/><path d="M19 8v1"/><path d="M19 13v1"/><path d="m21.5 9.5-.87.5"/><path d="m17.37 12-.87.5"/><path d="m21.5 12.5-.87-.5"/><path d="m17.37 10-.87-.5"/></svg>
          <svg *ngIf="icon === 'users'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <svg *ngIf="icon === 'shopping-cart'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <svg *ngIf="icon === 'trending-up'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <svg *ngIf="icon === 'truck'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <svg *ngIf="icon === 'pause-circle'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>
          <svg *ngIf="icon === 'alert-triangle'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg *ngIf="icon === 'receipt'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
          <svg *ngIf="icon === 'package'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
          <svg *ngIf="icon === 'clipboard-list'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
          <svg *ngIf="icon === 'map-pin'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <svg *ngIf="icon === 'clock'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <svg *ngIf="icon === 'shield'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <svg *ngIf="icon === 'bar-chart-2'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <svg *ngIf="icon === 'credit-card'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <svg *ngIf="icon === 'user-plus'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          <svg *ngIf="icon === 'home'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <svg *ngIf="icon === 'activity'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <svg *ngIf="icon === 'store'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value" [title]="value.toString()">{{ value }}</span>
          <span class="stat-card__title" [title]="title">{{ title }}</span>
          <span *ngIf="subtitle" class="stat-card__subtitle" [title]="subtitle" [class]="'stat-card__trend--' + trend">
            <svg *ngIf="trend === 'up'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
            <svg *ngIf="trend === 'down'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/></svg>
            {{ subtitle }}
          </span>
        </div>
      </ng-container>
      <ng-container *ngIf="loading">
        <div class="stat-card__icon skeleton" style="width:40px;height:40px;border-radius:var(--radius-md);flex-shrink:0"></div>
        <div class="stat-card__content">
          <div class="skeleton" style="width:40%;height:14px;border-radius:var(--radius-sm);margin-bottom:6px"></div>
          <div class="skeleton" style="width:60%;height:22px;border-radius:var(--radius-sm)"></div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
    }
    .stat-card {
      display: flex; flex-direction: row; align-items: center; justify-content: flex-start; width: 100%; height: 96px; padding: 0 20px;
      gap: 16px; box-sizing: border-box; overflow: hidden;
      background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
      border: 1px solid var(--border-default);
      transition: box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out);
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .stat-card__icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-card__icon--blue { background: #eff6ff; color: #2563eb; }
    .stat-card__icon--green { background: #ecfdf5; color: #059669; }
    .stat-card__icon--amber { background: #fffbeb; color: #d97706; }
    .stat-card__icon--red { background: #fef2f2; color: #ef4444; }
    .stat-card__icon--purple { background: #f5f3ff; color: #7c3aed; }
    .stat-card__icon--teal { background: #f0fdfa; color: #0d9488; }
    .stat-card__icon--pink { background: #fdf2f8; color: #db2777; }
    :host-context(.dark) .stat-card__icon--blue { background: rgba(37,99,235,.15); }
    :host-context(.dark) .stat-card__icon--green { background: rgba(5,150,105,.15); }
    :host-context(.dark) .stat-card__icon--amber { background: rgba(217,119,6,.15); }
    :host-context(.dark) .stat-card__icon--red { background: rgba(239,68,68,.15); }
    :host-context(.dark) .stat-card__icon--purple { background: rgba(124,58,237,.15); }
    :host-context(.dark) .stat-card__icon--teal { background: rgba(13,148,136,.15); }
    :host-context(.dark) .stat-card__icon--pink { background: rgba(219,39,119,.15); }
    .stat-card__content { display: flex; flex-direction: column; gap: 0px; flex: 1; min-width: 0; margin-top: 0; }
    .stat-card__value {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-family: var(--font-display);
      font-size: 22px;
      order: 2;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .stat-card__title {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      order: 1;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .stat-card__subtitle {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 11px;
      order: 3;
      margin-top: 2px;
      color: var(--text-tertiary);
      min-width: 0;
    }
    .stat-card__subtitle svg { flex-shrink: 0; }
    .stat-card__trend--up { color: #059669; }
    .stat-card__trend--down { color: #ef4444; }
  `]
})
export class HulStatCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() subtitle = '';
  @Input() icon = 'package';
  @Input() iconColor: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'pink' = 'blue';
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() loading = false;
}
