import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'hul-search-input',
  standalone: false,
  template: `
    <div class="search-input" [class.search-input--focused]="focused">
      <svg class="search-input__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input class="search-input__field" type="text"
             [placeholder]="placeholder"
             [value]="value"
             (input)="onInput($event)"
             (focus)="focused = true"
             (blur)="focused = false"
             autocomplete="off" />
      <button *ngIf="value" class="search-input__clear" (click)="clear()" aria-label="Clear search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `,
  styles: [`
    .search-input {
      display: flex; align-items: center; gap: 8px; padding: 0 12px;
      border: 1px solid var(--border-default); border-radius: var(--radius-lg);
      background: var(--bg-card); transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
      height: 40px;
    }
    .search-input--focused { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--hul-primary-light); }
    .search-input__icon { color: var(--text-tertiary); flex-shrink: 0; }
    .search-input__field {
      flex: 1; border: none; background: transparent; color: var(--text-primary); font-size: 14px;
      font-family: var(--font-body); outline: none; min-width: 0;
    }
    .search-input__field::placeholder { color: var(--text-tertiary); }
    .search-input__clear {
      display: flex; align-items: center; justify-content: center; border: none; background: none;
      cursor: pointer; padding: 4px; border-radius: var(--radius-sm); color: var(--text-tertiary);
      transition: color var(--duration-fast), background var(--duration-fast);
    }
    .search-input__clear:hover { color: var(--text-primary); background: var(--bg-muted); }
  `]
})
export class HulSearchInputComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search...';
  @Input() debounceMs = 350;
  @Output() searchChange = new EventEmitter<string>();

  value = '';
  focused = false;
  private searchSubject = new Subject<string>();
  private sub!: Subscription;

  ngOnInit(): void {
    this.sub = this.searchSubject.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged()
    ).subscribe(val => this.searchChange.emit(val));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.value);
  }

  clear(): void {
    this.value = '';
    this.searchSubject.next('');
  }
}
