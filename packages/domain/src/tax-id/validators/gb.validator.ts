import { formatValidator, type TaxIdValidator } from '../tax-id-validator.js';

/**
 * United Kingdom: VAT registration number, 9 digits; 12 digits (branches); GD + 3 digits (government
 * departments); HA + 3 digits (health authorities). Sources: HMRC VATREG03700; VIES structure of XI, notes 5–7.
 * Northern Ireland (XI) is out of scope (CL-54).
 * Only the format is validated outside Spain (03-validacion-fiscal §4).
 */
export const GB_VALIDATOR: TaxIdValidator = formatValidator({
  country: 'GB',
  prefix: 'GB',
  format: /^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
  type: 'VAT',
});
