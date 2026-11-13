import { Pipe, type PipeTransform } from '@angular/core';
import { type Currency, CURRENCY_DECIMALS } from '@saas-o-matic/domain';

const FORMATS = new Map<Currency, Intl.NumberFormat>();
const PERCENT = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 2 });
/** The date of the rates is the provider's daily date, in UTC (D-145). */
const RATES_DATE = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatterFor(currency: Currency): Intl.NumberFormat {
  let format = FORMATS.get(currency);
  if (format === undefined) {
    format = new Intl.NumberFormat('es-ES', { style: 'currency', currency });
    FORMATS.set(currency, format);
  }
  return format;
}

/**
 * Amount in minor units of `currency` → «169,40 €», «≈ 141,61 GBP», «≈ 24.812 JPY» (es-ES, D-35, spec 05 §4.5). The
 * minor units come from the D-20 conversion, already rounded to the decimals of the currency; outside EUR the
 * amount is approximate (D-19) and carries «≈».
 */
export function formatMoney(minorUnits: number, currency: Currency = 'EUR'): string {
  const text = formatterFor(currency).format(minorUnits / 10 ** CURRENCY_DECIMALS[currency]);
  return currency === 'EUR' ? text : `≈ ${text}`;
}

/** Tax rate in basis points → «21 %». */
export function formatTaxRate(bps: number): string {
  return PERCENT.format(bps / 10_000);
}

/** When the provider updated the rates (ms) → «12/11/2026», the same in every time zone (D-145). */
export function formatRatesDate(updatedAt: number): string {
  return RATES_DATE.format(updatedAt);
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(minorUnits: number, currency: Currency = 'EUR'): string {
    return formatMoney(minorUnits, currency);
  }
}

@Pipe({ name: 'taxRate' })
export class TaxRatePipe implements PipeTransform {
  transform(bps: number): string {
    return formatTaxRate(bps);
  }
}
