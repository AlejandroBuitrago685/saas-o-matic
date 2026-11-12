import { validateTariff, type TariffInput, type ValidTariff } from '../pricing/validate-tariff.js';
import type { ConfigIssue } from '../shared/config-issue.js';
import { err, ok, type Result } from '../shared/result.js';
import { isValidTaxRateBps } from '../tax/calculate-tax.js';
import { COUNTRIES, PLANS, type Country, type Plan } from './constants.js';

/** Catalog as configured (ADR-005) or received as JSON: codes are plain strings until validated. */
export interface CatalogInput {
  readonly countries: readonly { readonly code: string; readonly taxRateBps: number }[];
  readonly plans: readonly { readonly code: string; readonly tariffCode: string }[];
  readonly tariffs: readonly TariffInput[];
}

/** A validated catalog: every country has a rate and every plan a valid tariff. */
export interface Catalog {
  readonly tariffs: readonly ValidTariff[];
  readonly taxRateBps: Readonly<Record<Country, number>>;
  readonly tariffByPlan: Readonly<Record<Plan, ValidTariff>>;
}

interface ClosedList {
  readonly section: string;
  readonly noun: string;
  readonly allowed: readonly string[];
}

/** Codes that appear more than once, each reported once. */
const duplicatesOf = (codes: readonly string[]): string[] => [
  ...new Set(codes.filter((code, index) => codes.indexOf(code) !== index)),
];

/** Unknown, duplicated and missing codes of a closed list (each code exactly once). */
function closedListIssues({ section, noun, allowed }: ClosedList, codes: readonly string[]): ConfigIssue[] {
  const unknown = codes.filter((code) => !allowed.includes(code));
  const duplicated = duplicatesOf(codes);
  const missing = allowed.filter((code) => !codes.includes(code));
  return [
    ...unknown.map((code) => ({
      path: `${section}[${code}]`,
      message: `is not a ${noun} of the catalog (${allowed.join(', ')})`,
    })),
    ...duplicated.map((code) => ({ path: `${section}[${code}]`, message: 'is duplicated' })),
    ...missing.map((code) => ({ path: section, message: `missing ${code}` })),
  ];
}

function countryIssues(countries: CatalogInput['countries']): ConfigIssue[] {
  const list = { section: 'countries', noun: 'country', allowed: COUNTRIES };
  return [
    ...closedListIssues(
      list,
      countries.map(({ code }) => code),
    ),
    ...countries
      .filter(({ taxRateBps }) => !isValidTaxRateBps(taxRateBps))
      .map(({ code }) => ({
        path: `countries[${code}].taxRateBps`,
        message: 'must be an integer from 0 to 10 000 (basis points)',
      })),
  ];
}

function planIssues(plans: CatalogInput['plans'], tariffCodes: readonly string[]): ConfigIssue[] {
  const list = { section: 'plans', noun: 'plan', allowed: PLANS };
  return [
    ...closedListIssues(
      list,
      plans.map(({ code }) => code),
    ),
    ...plans
      .filter(({ tariffCode }) => !tariffCodes.includes(tariffCode))
      .map(({ code, tariffCode }) => ({
        path: `plans[${code}].tariffCode`,
        message: `there is no tariff ${tariffCode}`,
      })),
  ];
}

function tariffIssues(tariffs: readonly TariffInput[]): { valid: ValidTariff[]; issues: ConfigIssue[] } {
  const codes = tariffs.map(({ code }) => code);
  const duplicated = duplicatesOf(codes);
  const results = tariffs.map(validateTariff);
  return {
    valid: results.flatMap((result) => (result.ok ? [result.value] : [])),
    issues: [
      ...duplicated.map((code) => ({ path: `tariffs[${code}]`, message: 'is duplicated' })),
      ...results.flatMap((result) => (result.ok ? [] : result.error)),
    ],
  };
}

function buildCatalog(input: CatalogInput, tariffs: readonly ValidTariff[]): Catalog {
  const tariffByCode = new Map(tariffs.map((tariff) => [tariff.code, tariff]));
  // The validation guarantees every country and plan exactly once and every tariff code: both records are total.
  const taxRateBps = Object.fromEntries(input.countries.map(({ code, taxRateBps: bps }) => [code, bps]));
  const tariffByPlan = Object.fromEntries(
    input.plans.map(({ code, tariffCode }) => [code, tariffByCode.get(tariffCode)]),
  );
  return Object.freeze({
    tariffs: Object.freeze([...tariffs]),
    taxRateBps: Object.freeze(taxRateBps) as Record<Country, number>,
    tariffByPlan: Object.freeze(tariffByPlan) as Record<Plan, ValidTariff>,
  });
}

/**
 * Validates the business catalog at startup (ADR-005, AC-07): closed lists of countries and plans, tax rates,
 * tariffs and the tariff of each plan. Returns **every** problem, each with the path of the datum that fails.
 */
export function validateCatalog(input: CatalogInput): Result<Catalog, readonly ConfigIssue[]> {
  const tariffs = tariffIssues(input.tariffs);
  const issues = [
    ...countryIssues(input.countries),
    ...planIssues(
      input.plans,
      input.tariffs.map(({ code }) => code),
    ),
    ...tariffs.issues,
  ];
  return issues.length > 0 ? err(issues) : ok(buildCatalog(input, tariffs.valid));
}

/** Tariff assigned to a plan (D-08): changing a price is changing catalog data, never `calculatePricing` (AC-06). */
export function tariffForPlan(catalog: Catalog, plan: Plan): ValidTariff {
  return catalog.tariffByPlan[plan];
}

/** General tax rate of a country, in basis points (D-09). */
export function taxRateFor(catalog: Catalog, country: Country): number {
  return catalog.taxRateBps[country];
}
