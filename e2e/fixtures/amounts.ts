/**
 * Euro amounts as the interface writes them in es-ES («1.234,56 €»), with whatever space the formatter puts before
 * the symbol (a non-breaking one), and ignoring the spaces the template leaves around the text. The figure is written
 * exactly as in the acceptance criterion.
 */
export function euros(figure: string): RegExp {
  return new RegExp(`^\\s*${figure.replaceAll('.', '\\.')}\\s€\\s*$`);
}

/** How es-ES writes each currency after the figure (Intl, spec 05 §4.5). */
const CURRENCY_SIGNS: Readonly<Record<string, string>> = {
  USD: 'US$',
  GBP: 'GBP',
  CHF: 'CHF',
  JPY: 'JPY',
  MXN: 'MXN',
};

/**
 * An amount in any currency: in EUR as `euros()`, and in any other currency approximate, with «≈» in front
 * (D-19): `amount('141,61', 'GBP')` matches «≈ 141,61 GBP».
 */
export function amount(figure: string, currency: string): RegExp {
  if (currency === 'EUR') return euros(figure);
  const sign = (CURRENCY_SIGNS[currency] ?? currency).replaceAll('$', '\\$');
  return new RegExp(`^\\s*≈\\s${figure.replaceAll('.', '\\.')}\\s${sign}\\s*$`);
}
