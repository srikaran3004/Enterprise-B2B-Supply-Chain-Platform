import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'date' | 'currency' | 'actions' | 'status';
  width?: string;
  sortable?: boolean;
}

@Component({
  selector: 'hul-table',
  standalone: false,
  template: `
    <div class="hul-table-wrapper">
      <table class="hul-table" *ngIf="!loading && data.length > 0">
        <thead>
          <tr>
            <th *ngIf="selectable" class="hul-table__checkbox">
              <input type="checkbox" (change)="toggleAll($event)" />
            </th>
            <th *ngFor="let col of columns" [style.width]="col.width || 'auto'">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of data; let i = index"
              class="hul-table__row"
              [style.animation-delay]="(i * 40) + 'ms'">
            <td *ngIf="selectable" class="hul-table__checkbox">
              <input type="checkbox" [checked]="selectedRows.has(i)" (change)="toggleRow(i)" />
            </td>
            <td *ngFor="let col of columns">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'currency'" class="hul-table__currency">
                  {{ row[col.key] | inrCurrency }}
                </span>
                <span *ngSwitchCase="'date'" class="hul-table__date">
                  {{ row[col.key] | date:'dd MMM yyyy' }}
                  <span class="hul-table__date-sub">{{ row[col.key] | relativeTime }}</span>
                </span>
                <hul-status-badge *ngSwitchCase="'status'" [status]="row[col.key]">
                </hul-status-badge>
                <hul-badge *ngSwitchCase="'badge'" [variant]="row[col.key + 'Variant'] || 'neutral'" size="sm">
                  {{ row[col.key] }}
                </hul-badge>
                <span *ngSwitchDefault>{{ row[col.key] }}</span>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading skeleton -->
      <table class="hul-table" *ngIf="loading">
        <thead>
          <tr>
            <th *ngFor="let col of columns" [style.width]="col.width || 'auto'">
              <div class="skeleton" style="height: 14px; width: 60%;"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of skeletonRows" class="hul-table__row">
            <td *ngFor="let col of columns">
              <div class="skeleton" style="height: 16px; width: 80%;"></div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div class="hul-table__empty" *ngIf="!loading && data.length === 0">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-disabled)">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
        </svg>
        <p>{{ emptyMessage || 'No data available' }}</p>
      </div>
    </div>
  `,
  styles: [`
    .hul-table-wrapper {
      overflow-x: auto;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      background: var(--bg-card);
    }

    .hul-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-body);
    }

    .hul-table thead {
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .hul-table th {
      background: var(--bg-subtle);
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-default);
      white-space: nowrap;
    }

    .hul-table td {
      padding: 14px 16px;
      font-size: 14px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-default);
      vertical-align: middle;
    }

    .hul-table__row {
      transition: background var(--duration-fast) var(--ease-out);
      animation: fadeIn 300ms var(--ease-out) both;
    }

    .hul-table__row:hover {
      background: var(--bg-subtle);
    }

    .hul-table__row:last-child td {
      border-bottom: none;
    }

    .hul-table__checkbox {
      width: 40px;
      text-align: center;
    }

    .hul-table__currency {
      font-family: var(--font-mono);
      font-weight: 500;
    }

    .hul-table__date {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .hul-table__date-sub {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .hul-table__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 12px;
      color: var(--text-tertiary);
      font-size: 14px;
    }

    .skeleton {
      background: linear-gradient(90deg, var(--bg-muted) 25%, var(--border-default) 50%, var(--bg-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
export class HulTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading = false;
  @Input() selectable = false;
  @Input() emptyMessage = '';

  selectedRows = new Set<number>();
  skeletonRows = Array(5).fill(0);

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.data.forEach((_, i) => this.selectedRows.add(i));
    } else {
      this.selectedRows.clear();
    }
  }

  toggleRow(index: number): void {
    if (this.selectedRows.has(index)) {
      this.selectedRows.delete(index);
    } else {
      this.selectedRows.add(index);
    }
  }
}
