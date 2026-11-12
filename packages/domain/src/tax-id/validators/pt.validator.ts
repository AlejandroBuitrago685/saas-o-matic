import { formatValidator, type TaxIdValidator } from '../tax-id-validator.js';

/**
 * Portugal: NIF-IVA (NIF/NIPC), 9 digits. Source: VIES FAQ Q11, consulted on 2026-11-12.
 * Only the format is validated outside Spain (03-validacion-fiscal §4).
 */
export const PT_VALIDATOR: TaxIdValidator = formatValidator({
  country: 'PT',
  prefix: 'PT',
  format: /^\d{9}$/,
  type: 'VAT',
});
