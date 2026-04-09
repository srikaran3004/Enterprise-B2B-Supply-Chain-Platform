import { Component, Input } from '@angular/core';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'hul-page-header',
  standalone: false,
  template: `
    <div class="page-header">
      <div class="page-header__left">
        <nav class="page-header__breadcrumbs" *ngIf="breadcrumbs.length">
          <span *ngFor="let crumb of breadcrumbs; let last = last">
            <a *ngIf="crumb.route && !last" [routerLink]="crumb.route" class="breadcrumb-link">{{ crumb.label }}</a>
            <span *ngIf="!crumb.route || last" class="breadcrumb-current">{{ crumb.label }}</span>
            <svg *ngIf="!last" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="breadcrumb-sep"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </nav>
        <h1 class="page-header__title">{{ title }}</h1>
        <p *ngIf="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header__right">
        <ng-content select="[page-actions]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 24px 0 20px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header__breadcrumbs {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }

    .breadcrumb-link {
      font-size: 13px;
      color: var(--text-tertiary);
      text-decoration: none;
      transition: color var(--duration-fast) var(--ease-out);
    }

    .breadcrumb-link:hover {
      color: var(--hul-primary);
    }

    .breadcrumb-current {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .breadcrumb-sep {
      color: var(--text-disabled);
      margin: 0 2px;
      vertical-align: middle;
    }

    .page-header__title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .page-header__subtitle {
      font-size: 14px;
      color: var(--text-tertiary);
      margin: 4px 0 0;
    }

    .page-header__right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 640px) {
      .page-header {
        flex-direction: column;
      }
      .page-header__title {
        font-size: 20px;
      }
    }
  `]
})
export class HulPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
}
