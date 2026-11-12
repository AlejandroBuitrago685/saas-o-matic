import type { Country, TaxIdType } from '../catalog/constants.js';
import type { TaxIdValidator } from './tax-id-validator.js';
import { DE_VALIDATOR } from './validators/de.validator.js';
import { ES_VALIDATOR } from './validators/es.validator.js';
import { FR_VALIDATOR } from './validators/fr.validator.js';
import { GB_VALIDATOR } from './validators/gb.validator.js';
import { IT_VALIDATOR } from './validators/it.validator.js';
import { PT_VALIDATOR } from './validators/pt.validator.js';
import { US_VALIDATOR } from './validators/us.validator.js';

/**
 * One validator per country of the catalog (RNF-26, AC-16, D-100). The type is a total record over `Country`: a
 * country added to `COUNTRIES` without its validator does not compile, which is stronger than failing at startup.
 */
export const TAX_ID_VALIDATORS: Readonly<Record<Country, TaxIdValidator>> = Object.freeze({
  ES: ES_VALIDATOR,
  PT: PT_VALIDATOR,
  FR: FR_VALIDATOR,
  DE: DE_VALIDATOR,
  IT: IT_VALIDATOR,
  GB: GB_VALIDATOR,
  US: US_VALIDATOR,
});

/** What `GET /catalog` publishes about a country's tax id (04-contrato-api §3.1), read from its validator. */
export interface TaxIdRules {
  readonly prefix: string | null;
  readonly types: readonly TaxIdType[];
}

/** Prefix and types of a country's tax id: one source of truth with the validators (ADR-005). */
export function taxIdRulesFor(country: Country): TaxIdRules {
  const { prefix, types } = TAX_ID_VALIDATORS[country];
  return { prefix, types };
}
