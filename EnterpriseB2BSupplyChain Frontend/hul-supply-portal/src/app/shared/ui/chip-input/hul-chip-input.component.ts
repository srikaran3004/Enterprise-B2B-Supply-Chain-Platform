import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'hul-chip-input',
  standalone: false,
  template: `
    <div class="chip-input-wrap">
      <label *ngIf="label" class="chip-input__label">{{ label }}</label>
      <div class="chip-input" [class.chip-input--focused]="focused" (click)="onFocus()">
        <span *ngFor="let chip of selected" class="chip">
          {{ chip }}
          <button class="chip__remove" (click)="removeChip(chip); $event.stopPropagation()" aria-label="Remove">×</button>
        </span>
        <input #input class="chip-input__field" [placeholder]="selected.length ? '' : placeholder"
               (focus)="focused = true; showDropdown = true"
               (blur)="onBlur()"
               (keydown)="onKeydown($event)"
               (input)="filterText = input.value" />
      </div>
      <div *ngIf="showDropdown && availableOptions.length > 0" class="chip-dropdown">
        <button *ngFor="let opt of availableOptions" class="chip-dropdown__item" (mousedown)="addChip(opt)">
          {{ opt }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chip-input-wrap { position: relative; }
    .chip-input__label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
    .chip-input {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; min-height: 40px;
      border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-card); cursor: text; align-items: center;
      transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
    }
    .chip-input--focused { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; background: var(--hul-primary-light); color: var(--hul-primary); border-radius: 9999px; font-size: 13px; font-weight: 500; }
    .chip__remove { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--hul-primary); line-height: 1; padding: 0 2px; }
    .chip__remove:hover { color: var(--hul-danger); }
    .chip-input__field { flex: 1; min-width: 60px; border: none; background: transparent; outline: none; font-size: 14px; color: var(--text-primary); font-family: var(--font-body); }
    .chip-input__field::placeholder { color: var(--text-tertiary); }
    .chip-dropdown {
      position: absolute; left: 0; right: 0; top: 100%; margin-top: 4px;
      background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg); z-index: 50; max-height: 180px; overflow-y: auto;
    }
    .chip-dropdown__item {
      display: block; width: 100%; text-align: left; padding: 10px 14px;
      border: none; background: none; font-size: 14px; color: var(--text-primary);
      cursor: pointer; font-family: var(--font-body);
    }
    .chip-dropdown__item:hover { background: var(--bg-muted); }
  `]
})
export class HulChipInputComponent {
  @Input() label = '';
  @Input() placeholder = 'Select...';
  @Input() options: string[] = [];
  @Input() selected: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  focused = false;
  showDropdown = false;
  filterText = '';

  get availableOptions(): string[] {
    return this.options.filter(o => !this.selected.includes(o) && o.toLowerCase().includes(this.filterText.toLowerCase()));
  }

  addChip(val: string): void {
    this.selected = [...this.selected, val];
    this.filterText = '';
    this.selectionChange.emit(this.selected);
  }

  removeChip(val: string): void {
    this.selected = this.selected.filter(s => s !== val);
    this.selectionChange.emit(this.selected);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !this.filterText && this.selected.length > 0) {
      this.removeChip(this.selected[this.selected.length - 1]);
    }
    if (e.key === 'Enter' && this.availableOptions.length > 0) {
      e.preventDefault();
      this.addChip(this.availableOptions[0]);
    }
  }

  onFocus(): void { this.focused = true; this.showDropdown = true; }
  onBlur(): void { setTimeout(() => { this.focused = false; this.showDropdown = false; }, 150); }
}
