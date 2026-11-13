import { Pipe, type PipeTransform } from '@angular/core';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const PERCENT = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 2 });

/**
 * Amount in EUR cents → «169,40 €» (es-ES, D-35, spec 05 §4.5). Conversion to other currencies and the «≈»
 * sign arrive with P8.
 */
export function formatMoney(cents: number): string {
  return EUR.format(cents / 100);
}

/** Tax rate in basis points → «21 %». */
export function formatTaxRate(bps: number): string {
  return PERCENT.format(bps / 10_000);
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number): string {
    return formatMoney(cents);
  }
}

@Pipe({ name: 'taxRate' })
export class TaxRatePipe implements PipeTransform {
  transform(bps: number): string {
    return formatTaxRate(bps);
  }
}
