import { Component, Input } from '@angular/core';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

export interface TimelineEvent {
  label: string;
  description?: string;
  timestamp: string;
  actor?: string;
  icon?: string;
  variant?: 'completed' | 'active' | 'pending';
}

@Component({
  selector: 'hul-timeline',
  standalone: false,
  template: `
    <div class="timeline">
      <div *ngFor="let event of events; let i = index; let last = last"
           class="timeline__item timeline__item--{{ event.variant || (last ? 'active' : 'completed') }}">
        <div class="timeline__dot">
          <svg *ngIf="(event.variant || (!last ? 'completed' : 'active')) === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="timeline__connector" *ngIf="!last"></div>
        <div class="timeline__content">
          <span class="timeline__label">{{ event.label }}</span>
          <span *ngIf="event.description" class="timeline__desc">{{ event.description }}</span>
          <span *ngIf="event.actor" class="timeline__actor">by {{ event.actor }}</span>
          <span class="timeline__time" [title]="event.timestamp">{{ event.timestamp | relativeTime }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline { display: flex; flex-direction: column; padding: 4px 0; }
    .timeline__item { display: flex; gap: 12px; position: relative; padding-bottom: 24px; }
    .timeline__item:last-child { padding-bottom: 0; }
    .timeline__dot {
      width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; z-index: 1; margin-top: 2px;
    }
    .timeline__item--completed .timeline__dot { background: var(--hul-success); color: white; }
    .timeline__item--active .timeline__dot {
      background: var(--hul-primary); box-shadow: 0 0 0 4px var(--hul-primary-light);
      animation: pulse-ring 2s infinite;
    }
    .timeline__item--pending .timeline__dot { background: var(--bg-muted); border: 2px solid var(--border-default); }
    .timeline__connector {
      position: absolute; left: 11px; top: 28px; bottom: 0; width: 2px;
      background: var(--border-default);
    }
    .timeline__item--completed .timeline__connector { background: var(--hul-success); }
    .timeline__content { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .timeline__label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .timeline__desc { font-size: 13px; color: var(--text-secondary); }
    .timeline__actor { font-size: 12px; color: var(--text-tertiary); }
    .timeline__time { font-size: 12px; color: var(--text-tertiary); }
    @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 4px var(--hul-primary-light); } 50% { box-shadow: 0 0 0 8px transparent; } }
  `]
})
export class HulTimelineComponent {
  @Input() events: TimelineEvent[] = [];
}
