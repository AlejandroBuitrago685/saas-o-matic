import { formatValidator, type TaxIdValidator } from '../tax-id-validator.js';

/**
 * France: n° TVA intracommunautaire, 2 characters (a digit or a letter other than I and O) + 9 digits.
 * Sources: VIES FAQ Q11; HMRC «VAT EU country codes» (I and O excluded), consulted on 2026-11-12.
 * Only the format is validated outside Spain (03-validacion-fiscal §4).
 */
export const FR_VALIDATOR: TaxIdValidator = formatValidator({
  country: 'FR',
  prefix: 'FR',
  format: /^[0-9A-HJ-NP-Z]{2}\d{9}$/,
  type: 'VAT',
});
