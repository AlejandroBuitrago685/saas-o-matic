// @ts-check
/**
 * Number formats of the walkthrough (es-ES, as the application; 05-frontend §2). The non-breaking spaces of Intl are
 * written as plain spaces: invisible characters are not allowed in the repository (D-96), and the page keeps each
 * amount on one line with CSS (`.amount`).
 */

import { raw } from './html.mjs';

const INTEGER = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
const SPECIAL_SPACES = new RegExp(`[${String.fromCodePoint(0xa0, 0x202f)}]`, 'g');

/**
 * @param {number} value
 * @returns {string} the integer with a space between thousands («1 378»), as the documents write it
 */
export function integer(value) {
  return INTEGER.format(value).replace(/\./g, ' ').replace(SPECIAL_SPACES, ' ');
}

/**
 * @param {number} value
 * @returns {import('./html.mjs').SafeHtml} the integer for running text: its groups are joined by a narrow no-break
 * space, written as an entity (a literal one is an invisible character, D-96), so «1 085» never breaks
 */
export function num(value) {
  return raw(integer(value).replace(/ /g, '&#8239;'));
}

/**
 * @param {number} minorUnits amount in the minor unit of `currency` (cents for EUR and GBP, yen for JPY)
 * @param {string} currency ISO 4217 code
 * @param {number} [decimals] the minor-unit digits of the currency
 * @returns {string} «810,70 €», «475,39 GBP»
 */
export function money(minorUnits, currency, decimals = 2) {
  const format = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: 'always',
  });
  return format.format(minorUnits / 10 ** decimals).replace(SPECIAL_SPACES, ' ');
}

/** @param {number} cents */
export const euros = (cents) => money(cents, 'EUR');

/**
 * @param {number} bps basis points (2100 = 21 %)
 * @returns {string} «21 %», «8,1 %»
 */
export function percent(bps) {
  const value = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(bps / 100);
  return `${value} %`;
}
