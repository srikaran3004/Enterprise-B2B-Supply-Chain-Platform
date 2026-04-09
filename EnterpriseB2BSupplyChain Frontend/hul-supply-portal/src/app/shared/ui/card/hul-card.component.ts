import { Component, Input } from '@angular/core';

@Component({
  selector: 'hul-card',
  standalone: false,
  template: `
    <div class="hul-card" [ngClass]="getClasses()" [class.hul-card--clickable]="clickable"
         [class.hul-card--selected]="selected" [class.hul-card--hover]="hover"
         [tabindex]="clickable ? 0 : -1">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .hul-card {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      transition: transform var(--duration-base) var(--ease-out),
                  box-shadow var(--duration-base) var(--ease-out),
                  border-color var(--duration-base) var(--ease-out);
      border: 1px solid transparent;
    }

    .hul-card--padding-sm { padding: 12px; }
    .hul-card--padding-md { padding: 20px; }
    .hul-card--padding-lg { padding: 28px; }

    .hul-card--shadow-none { box-shadow: none; }
    .hul-card--shadow-sm { box-shadow: var(--shadow-sm); }
    .hul-card--shadow-md { box-shadow: var(--shadow-md); }
    .hul-card--shadow-lg { box-shadow: var(--shadow-lg); }

    .hul-card--hover:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .hul-card--clickable {
      cursor: pointer;
    }

    .hul-card--clickable:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .hul-card--selected {
      border-color: var(--hul-primary);
      background: var(--hul-primary-light);
    }

    .hul-card:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }
  `]
})
export class HulCardComponent {
  @Input() padding: 'sm' | 'md' | 'lg' = 'md';
  @Input() shadow: 'none' | 'sm' | 'md' | 'lg' = 'sm';
  @Input() hover = false;
  @Input() clickable = false;
  @Input() selected = false;

  getClasses(): string {
    return `hul-card--padding-${this.padding} hul-card--shadow-${this.shadow}`;
  }
}
