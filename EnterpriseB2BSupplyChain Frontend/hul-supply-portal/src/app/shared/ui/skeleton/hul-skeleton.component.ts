import { Component, Input } from '@angular/core';

@Component({
  selector: 'hul-skeleton',
  standalone: false,
  template: `
    <ng-container [ngSwitch]="type">
      <div *ngSwitchCase="'text'" class="skeleton-group">
        <div *ngFor="let i of items" class="skeleton skeleton--text" [style.width]="getRandomWidth()"></div>
      </div>
      <div *ngSwitchCase="'card'" class="skeleton-cards">
        <div *ngFor="let i of items" class="skeleton-card">
          <div class="skeleton skeleton--image"></div>
          <div class="skeleton skeleton--line" style="width: 70%; margin-top: 12px;"></div>
          <div class="skeleton skeleton--line" style="width: 50%; margin-top: 8px;"></div>
          <div class="skeleton skeleton--line" style="width: 30%; margin-top: 8px;"></div>
        </div>
      </div>
      <div *ngSwitchCase="'table'" class="skeleton-table">
        <div *ngFor="let i of items" class="skeleton-table-row">
          <div class="skeleton skeleton--cell" *ngFor="let c of [1,2,3,4,5]"></div>
        </div>
      </div>
      <div *ngSwitchCase="'avatar'" class="skeleton-avatars">
        <div *ngFor="let i of items" class="skeleton skeleton--avatar"></div>
      </div>
      <div *ngSwitchCase="'product-card'" class="skeleton-product-cards">
        <div *ngFor="let i of items" class="skeleton-product">
          <div class="skeleton skeleton--product-img"></div>
          <div style="padding: 14px;">
            <div class="skeleton skeleton--line" style="width: 40%; height: 10px;"></div>
            <div class="skeleton skeleton--line" style="width: 80%; height: 16px; margin-top: 8px;"></div>
            <div class="skeleton skeleton--line" style="width: 50%; height: 12px; margin-top: 6px;"></div>
            <div class="skeleton skeleton--line" style="width: 35%; height: 20px; margin-top: 12px;"></div>
            <div class="skeleton skeleton--line" style="width: 100%; height: 36px; margin-top: 12px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(90deg, var(--bg-muted) 25%, var(--border-default) 50%, var(--bg-muted) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }

    .skeleton-group { display: flex; flex-direction: column; gap: 10px; }
    .skeleton--text { height: 14px; }

    .skeleton-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .skeleton-card {
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      padding: 16px;
    }
    .skeleton--image { height: 120px; border-radius: var(--radius-md); }
    .skeleton--line { height: 14px; }

    .skeleton-table { display: flex; flex-direction: column; gap: 1px; }
    .skeleton-table-row {
      display: flex;
      gap: 16px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-default);
    }
    .skeleton--cell { height: 16px; flex: 1; }

    .skeleton-avatars { display: flex; gap: 12px; }
    .skeleton--avatar { width: 40px; height: 40px; border-radius: 50%; }

    .skeleton-product-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .skeleton-product {
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
      overflow: hidden;
    }
    .skeleton--product-img { height: 140px; }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
export class HulSkeletonComponent {
  @Input() type: 'text' | 'card' | 'table' | 'avatar' | 'product-card' = 'text';
  @Input() count = 3;

  get items(): number[] {
    return Array(this.count).fill(0);
  }

  getRandomWidth(): string {
    const widths = ['60%', '80%', '70%', '90%', '75%'];
    return widths[Math.floor(Math.random() * widths.length)];
  }
}
