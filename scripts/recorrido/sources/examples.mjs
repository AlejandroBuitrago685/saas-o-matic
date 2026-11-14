// @ts-check
/**
 * The numbers of the product flow (D-183): every example runs the compiled domain package with the real catalog of
 * the API and the reference exchange rates of the tests. Nothing here repeats a business rule; it only calls them.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  calculatePricing,
  convertPricing,
  normalizeForSearch,
  tariffForPlan,
  taxRateFor,
  toExchangeRate,
  usersToPosition,
  validateCatalog,
  validateTaxId,
} from '@saas-o-matic/domain';

import { REPO_ROOT } from '../../lib/repo.mjs';

export const CATALOG_FILE = 'apps/api/src/config/catalog.data.ts';
export const RATES_FILE = 'e2e/fixtures/exchange-rates.ts';

/** @typedef {import('@saas-o-matic/domain').Catalog} Catalog */
/** @typedef {import('@saas-o-matic/domain').Country} Country */
/** @typedef {{ tier: number, fromUser: number, toUser: number | null, units: number, unitPriceCents: number, subtotalCents: number }} TierLine */
/** @typedef {{ users: number, country: Country, taxRateBps: number, tiers: TierLine[], baseCents: number, taxCents: number, totalCents: number }} PricingExample */

/**
 * @template T
 * @param {{ ok: true, value: T } | { ok: false, error: unknown }} result
 * @param {string} what
 * @returns {T}
 */
function unwrap(result, what) {
  if (!result.ok) throw new Error(`examples: ${what} failed (${JSON.stringify(result.error)})`);
  return result.value;
}

/** @returns {Promise<import('@saas-o-matic/domain').CatalogInput>} the catalog of the API, as it is configured */
export async function loadCatalogInput() {
  /** @type {{ CATALOG_DATA: import('@saas-o-matic/domain').CatalogInput }} */
  const module = await import(pathToFileURL(join(REPO_ROOT, CATALOG_FILE)).href);
  return module.CATALOG_DATA;
}

/**
 * @param {import('@saas-o-matic/domain').CatalogInput} input
 * @returns {Catalog} the catalog validated as the API validates it at startup
 */
export function validCatalog(input) {
  return unwrap(validateCatalog(input), 'validateCatalog');
}

/**
 * @param {number} users
 * @returns {number} the slider position of the simulator for that number of users
 */
export function sliderPosition(users) {
  return unwrap(usersToPosition(users), 'usersToPosition');
}

/** @returns {Promise<Readonly<Record<string, number>>>} the reference rates of the tests (02-reglas §4.1) */
export async function loadReferenceRates() {
  /** @type {{ REFERENCE_RATES: { rates: Readonly<Record<string, number>> } }} */
  const module = await import(pathToFileURL(join(REPO_ROOT, RATES_FILE)).href);
  return module.REFERENCE_RATES.rates;
}

/**
 * @param {Catalog} catalog
 * @param {number} users
 * @param {Country} country
 * @returns {PricingExample}
 */
export function pricingExample(catalog, users, country) {
  const taxRateBps = taxRateFor(catalog, country);
  // Every plan uses the STANDARD tariff until business says otherwise (D-08): any plan gives the same numbers.
  const pricing = unwrap(
    calculatePricing(tariffForPlan(catalog, 'STARTER'), users, taxRateBps),
    'calculatePricing',
  );
  return { ...pricing, users, country, taxRateBps, tiers: [...pricing.tiers] };
}

/**
 * @param {PricingExample} example
 * @param {'GBP' | 'USD' | 'CHF' | 'JPY' | 'MXN'} currency
 * @param {Readonly<Record<string, number>>} rates
 */
export function convertedExample(example, currency, rates) {
  const rate = unwrap(toExchangeRate(rates[currency] ?? Number.NaN), 'toExchangeRate');
  const converted = unwrap(convertPricing(example, { currency, rate }), 'convertPricing');
  return { ...converted, currency, rate: rates[currency] ?? 0 };
}

/**
 * @param {string} input
 * @param {Country} country
 * @returns {{ input: string, isValid: boolean, detail: string }} what the domain answers for that identifier
 */
export function taxIdExample(input, country) {
  const result = validateTaxId(input, country);
  return { input, isValid: result.ok, detail: result.ok ? result.value.type : result.error };
}

/**
 * @param {string} text
 * @returns {{ text: string, normalized: string }}
 */
export function searchExample(text) {
  return { text, normalized: normalizeForSearch(text) };
}

/**
 * @param {Catalog} catalog
 * @returns {{ country: string, taxRateBps: number }[]} the tax rate of every country of the catalog
 */
export function taxRates(catalog) {
  return Object.entries(catalog.taxRateBps).map(([country, taxRateBps]) => ({ country, taxRateBps }));
}
