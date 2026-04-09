import { Component, Input, forwardRef, ElementRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'hul-input',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HulInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="hul-input" [class.hul-input--focused]="focused" [class.hul-input--filled]="!!value"
         [class.hul-input--error]="error" [class.hul-input--disabled]="disabled">
      <label *ngIf="label" class="hul-input__label" [class.hul-input__label--float]="focused || !!value">
        {{ label }}<span *ngIf="required" class="hul-input__required">*</span>
      </label>
      <div class="hul-input__wrapper">
        <span *ngIf="prefixIcon" class="hul-input__prefix" [innerHTML]="getIconSvg(prefixIcon)"></span>
        <input
          #inputEl
          [type]="currentType"
          [placeholder]="focused ? placeholder : ''"
          [disabled]="disabled"
          [attr.maxlength]="maxlength"
          [value]="value || ''"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          class="hul-input__field"
          autocomplete="off" />
        <button *ngIf="type === 'password'" type="button" class="hul-input__toggle"
                (click)="togglePassword()" tabindex="-1">
          <svg *ngIf="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg *ngIf="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
        <span *ngIf="suffixIcon && type !== 'password'" class="hul-input__suffix" [innerHTML]="getIconSvg(suffixIcon)"></span>
      </div>
      <span *ngIf="error" class="hul-input__error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        {{ error }}
      </span>
      <span *ngIf="hint && !error" class="hul-input__hint">{{ hint }}</span>
    </div>
  `,
  styles: [`
    .hul-input {
      position: relative;
      margin-bottom: 4px;
    }

    .hul-input__label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 6px;
      transition: all var(--duration-fast) var(--ease-out);
      font-family: var(--font-body);
    }

    .hul-input__required {
      color: var(--hul-danger);
      margin-left: 2px;
    }

    .hul-input__wrapper {
      display: flex;
      align-items: center;
      border: 1.5px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-base);
      transition: all var(--duration-base) var(--ease-out);
      overflow: hidden;
    }

    .hul-input--focused .hul-input__wrapper {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
    }

    .hul-input--error .hul-input__wrapper {
      border-color: var(--hul-danger) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }

    .hul-input--disabled .hul-input__wrapper {
      background: var(--bg-muted);
      opacity: 0.6;
    }

    .hul-input__field {
      flex: 1;
      border: none;
      outline: none;
      padding: 12px 14px;
      font-size: 15px;
      font-family: var(--font-body);
      color: var(--text-primary);
      background: transparent;
      width: 100%;
    }

    .hul-input__field::placeholder {
      color: var(--text-disabled);
    }

    .hul-input__prefix,
    .hul-input__suffix {
      display: flex;
      align-items: center;
      color: var(--text-tertiary);
      padding: 0 0 0 14px;
      flex-shrink: 0;
    }

    .hul-input__suffix {
      padding: 0 14px 0 0;
    }

    .hul-input--focused .hul-input__prefix,
    .hul-input--focused .hul-input__suffix {
      color: var(--hul-primary);
    }

    .hul-input__toggle {
      display: flex;
      align-items: center;
      padding: 0 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      transition: color var(--duration-fast) var(--ease-out);
    }

    .hul-input__toggle:hover {
      color: var(--text-primary);
    }

    .hul-input__error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--hul-danger);
      font-size: 13px;
      margin-top: 6px;
      font-family: var(--font-body);
    }

    .hul-input__hint {
      display: block;
      color: var(--text-tertiary);
      font-size: 12px;
      margin-top: 6px;
      font-family: var(--font-body);
    }
  `]
})
export class HulInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'tel' | 'number' = 'text';
  @Input() error = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() prefixIcon = '';
  @Input() suffixIcon = '';
  @Input() maxlength: number | null = null;

  value = '';
  focused = false;
  showPassword = false;
  currentType = this.type;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit() {
    this.currentType = this.type;
  }

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onFocus(): void {
    this.focused = true;
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.currentType = this.showPassword ? 'text' : 'password';
  }

  getIconSvg(iconName: string): string {
    const icons: Record<string, string> = {
      'mail': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      'lock': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      'user': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      'building-2': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
      'phone': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      'file-text': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      'map-pin': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      'search': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    };
    return icons[iconName] || '';
  }
}
