import { formatValidator, type TaxIdValidator } from '../tax-id-validator.js';

/**
 * Germany: NIF-IVA (USt-IdNr.), 9 digits. Source: VIES FAQ Q11, consulted on 2026-11-12.
 * Only the format is validated outside Spain (03-validacion-fiscal §4).
 */
export const DE_VALIDATOR: TaxIdValidator = formatValidator({
  country: 'DE',
  prefix: 'DE',
  format: /^\d{9}$/,
  type: 'VAT',
});
