import { formatValidator, type TaxIdValidator } from '../tax-id-validator.js';

/**
 * Italy: NIF-IVA (Partita IVA), 11 digits. Source: VIES FAQ Q11, consulted on 2026-11-12.
 * Only the format is validated outside Spain (03-validacion-fiscal §4).
 */
export const IT_VALIDATOR: TaxIdValidator = formatValidator({
  country: 'IT',
  prefix: 'IT',
  format: /^\d{11}$/,
  type: 'VAT',
});
