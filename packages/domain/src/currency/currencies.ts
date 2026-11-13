/** Currencies offered in the interface (D-21). EUR is the source of truth: the others are only for display (D-19). */
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'MXN'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type ForeignCurrency = Exclude<Currency, 'EUR'>;
/** The currencies that need a rate: all but EUR. */
export const FOREIGN_CURRENCIES: readonly ForeignCurrency[] = CURRENCIES.filter(
  (currency): currency is ForeignCurrency => currency !== 'EUR',
);

/** Decimals of each currency according to ISO 4217 (02-reglas §4, CL-34). */
export const CURRENCY_DECIMALS: Readonly<Record<Currency, number>> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
  JPY: 0,
  MXN: 2,
};

export function isCurrency(value: unknown): value is Currency {
  return (CURRENCIES as readonly unknown[]).includes(value);
}
