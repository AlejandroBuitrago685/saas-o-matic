import type { Country, TaxIdType } from '../catalog/constants.js';
import { err, ok, type Result } from '../shared/result.js';

/** Why a tax identifier is not valid (03-validacion-fiscal §1). */
export type TaxIdReason = 'INVALID_FORMAT' | 'INVALID_CHECK' | 'UNSUPPORTED_TYPE';

/** A valid tax identifier: the normalized value that is stored and compared (D-14, D-17), and its type. */
export interface ValidTaxId {
  readonly value: string;
  readonly type: TaxIdType;
}

/** Raw length accepted for a tax id before normalization (03-validacion-fiscal §1); the contract schema checks it. */
export const MIN_TAX_ID_INPUT_LENGTH = 1;
export const MAX_TAX_ID_INPUT_LENGTH = 32;

/** Common interface of every country validator (RNF-26): adding a country is a new file plus a registry entry. */
export interface TaxIdValidator {
  readonly country: Country;
  /** Optional country prefix that may precede the identifier; null when the country has none (US). */
  readonly prefix: string | null;
  /** Types this country's identifiers can have; `GET /catalog` publishes them (04-contrato-api §3.1). */
  readonly types: readonly TaxIdType[];
  /**
   * Validates an already normalized value: only `[A-Z0-9]`. `validateTaxId` calls it with the value as it is and, if
   * that fails and the value starts with the prefix, again without the prefix.
   */
  readonly validate: (value: string) => Result<TaxIdType, TaxIdReason>;
}

interface FormatRule {
  readonly country: Country;
  readonly prefix: string | null;
  readonly format: RegExp;
  readonly type: TaxIdType;
}

/** A validator that only checks the format, as 03-validacion-fiscal §4 asks outside Spain. */
export function formatValidator({ country, prefix, format, type }: FormatRule): TaxIdValidator {
  return {
    country,
    prefix,
    types: Object.freeze([type]),
    validate: (value) => (format.test(value) ? ok(type) : err('INVALID_FORMAT')),
  };
}
