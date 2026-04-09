import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-password-strength',
  standalone: false,
  template: `
    <div class="strength-meter">
      <div class="strength-meter__bar">
        <div class="strength-meter__fill"
             [style.width]="(score / 4 * 100) + '%'"
             [style.background]="barColor"></div>
      </div>
      <span class="strength-meter__label" [style.color]="barColor">{{ label }}</span>
    </div>
  `,
  styles: [`
    .strength-meter {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
    }

    .strength-meter__bar {
      flex: 1;
      height: 4px;
      background: var(--bg-muted);
      border-radius: 9999px;
      overflow: hidden;
    }

    .strength-meter__fill {
      height: 100%;
      border-radius: 9999px;
      transition: width var(--duration-base) var(--ease-out), background var(--duration-base) var(--ease-out);
    }

    .strength-meter__label {
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-body);
      white-space: nowrap;
    }
  `]
})
export class PasswordStrengthComponent implements OnChanges {
  @Input() password = '';

  score = 0;
  label = '';
  barColor = '';

  ngOnChanges(): void {
    this.calculateStrength();
  }

  private calculateStrength(): void {
    let score = 0;
    if (this.password.length >= 8) score++;
    if (/[A-Z]/.test(this.password)) score++;
    if (/[0-9]/.test(this.password)) score++;
    if (/[^A-Za-z0-9]/.test(this.password)) score++;

    this.score = score;

    const levels = [
      { label: '', color: 'transparent' },
      { label: 'Weak', color: '#ef4444' },
      { label: 'Fair', color: '#f59e0b' },
      { label: 'Strong', color: '#3b82f6' },
      { label: 'Very strong', color: '#10b981' },
    ];

    this.label = levels[score].label;
    this.barColor = levels[score].color;
  }
}
