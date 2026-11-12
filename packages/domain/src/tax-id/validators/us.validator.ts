import { err, ok } from '../../shared/result.js';
import type { TaxIdValidator } from '../tax-id-validator.js';
import { US_EIN_PREFIXES } from './us-ein-prefixes.js';

/**
 * United States: Employer Identification Number, 9 digits whose first two are a prefix assigned by the IRS (IRS,
 * «Instructions for Form SS-4 (12/2025)» and «Valid EINs»). No country prefix (TV-INT-30).
 */
export const US_VALIDATOR: TaxIdValidator = {
  country: 'US',
  prefix: null,
  types: Object.freeze(['EIN'] as const),
  validate: (value) =>
    /^\d{9}$/.test(value) && US_EIN_PREFIXES.has(value.slice(0, 2)) ? ok('EIN') : err('INVALID_FORMAT'),
};
