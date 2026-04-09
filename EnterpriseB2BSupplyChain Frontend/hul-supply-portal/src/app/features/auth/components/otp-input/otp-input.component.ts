import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="otp-container" [class.otp-container--error]="hasError" [class.otp-container--shake]="shaking">
      <input *ngFor="let digit of digits; let i = index"
             #otpInput
             type="text"
             maxlength="1"
             inputmode="numeric"
             pattern="[0-9]*"
             class="otp-box"
             [class.otp-box--filled]="digit"
             [class.otp-box--active]="activeIndex === i"
             [value]="digit"
             (input)="onInput($event, i)"
             (keydown)="onKeyDown($event, i)"
             (focus)="activeIndex = i"
             (blur)="activeIndex = -1"
             (paste)="onPaste($event, i)" />
    </div>
  `,
  styles: [`
    .otp-container {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .otp-container--shake {
      animation: shake 0.5s ease-in-out;
    }

    .otp-box {
      width: 48px;
      height: 56px;
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-primary);
      background: var(--bg-base);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-md);
      outline: none;
      transition: all var(--duration-fast) var(--ease-out);
      caret-color: transparent;
    }

    .otp-box:focus,
    .otp-box--active {
      border-color: var(--hul-primary);
      box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
    }

    .otp-box--filled {
      border-color: var(--hul-primary);
      background: var(--hul-primary-light);
    }

    :host-context(.dark) .otp-box--filled {
      background: rgba(3, 105, 161, 0.15);
    }

    .otp-container--error .otp-box {
      border-color: var(--hul-danger) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
  `]
})
export class OtpInputComponent implements ControlValueAccessor {
  @Input() length = 6;
  @Input() hasError = false;
  @Output() completed = new EventEmitter<string>();

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = [];
  activeIndex = -1;
  shaking = false;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit() {
    this.digits = Array(this.length).fill('');
  }

  writeValue(value: string): void {
    if (value) {
      this.digits = value.split('').slice(0, this.length);
      while (this.digits.length < this.length) this.digits.push('');
    } else {
      this.digits = Array(this.length).fill('');
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    if (value) {
      // Always take the last typed character in case of auto-fill or fast typing where input.value > 1 char
      const latestChar = value.slice(-1);
      this.digits[index] = latestChar;
      input.value = latestChar;
      
      if (index < this.length - 1) {
        this.focusInput(index + 1);
      }
    } else {
      this.digits[index] = '';
      input.value = '';
    }

    this.emitValue();
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.digits[index] && index > 0) {
        this.focusInput(index - 1);
        this.digits[index - 1] = '';
      } else {
        this.digits[index] = '';
      }
      this.emitValue();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      this.focusInput(index + 1);
    } else if (/^[0-9]$/.test(event.key)) {
      // Prevent default to stop browser from inserting the character natively, 
      // preventing the "double print" or composition leak into the next focused input
      event.preventDefault();
      this.digits[index] = event.key;
      
      if (index < this.length - 1) {
        this.focusInput(index + 1);
      }
      this.emitValue();
    }
  }

  onPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.replace(/[^0-9]/g, '') || '';
    if (paste.length > 0) {
      for (let i = 0; i < this.length && i < paste.length; i++) {
        this.digits[i] = paste[i];
      }
      const lastFilled = Math.min(paste.length, this.length) - 1;
      this.focusInput(lastFilled);
      this.emitValue();
    }
  }

  shake(): void {
    this.shaking = true;
    this.digits = Array(this.length).fill('');
    this.emitValue();
    setTimeout(() => {
      this.shaking = false;
      this.focusInput(0);
    }, 500);
  }

  private focusInput(index: number): void {
    setTimeout(() => {
      const inputArray = this.inputs?.toArray();
      if (inputArray && inputArray[index]) {
        inputArray[index].nativeElement.focus();
      }
    });
  }

  private emitValue(): void {
    const value = this.digits.join('');
    this.onChange(value);
    if (value.length === this.length && !this.digits.includes('')) {
      this.completed.emit(value);
    }
  }
}
