import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inrCurrency', standalone: false })
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, showSymbol: boolean = true): string {
    if (value === null || value === undefined || isNaN(value)) return showSymbol ? '₹0.00' : '0.00';

    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const [intPart, decPart] = absValue.toFixed(2).split('.');

    // Indian numbering: last 3 digits, then groups of 2
    let formatted = '';
    const len = intPart.length;
    if (len <= 3) {
      formatted = intPart;
    } else {
      formatted = intPart.substring(len - 3);
      let remaining = intPart.substring(0, len - 3);
      while (remaining.length > 2) {
        formatted = remaining.substring(remaining.length - 2) + ',' + formatted;
        remaining = remaining.substring(0, remaining.length - 2);
      }
      if (remaining.length > 0) {
        formatted = remaining + ',' + formatted;
      }
    }

    const result = `${formatted}.${decPart}`;
    const sign = isNegative ? '-' : '';
    return showSymbol ? `${sign}₹${result}` : `${sign}${result}`;
  }
}
