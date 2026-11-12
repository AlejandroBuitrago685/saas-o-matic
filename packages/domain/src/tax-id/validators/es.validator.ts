import type { TaxIdType } from '../../catalog/constants.js';
import { err, type Result } from '../../shared/result.js';
import type { TaxIdReason, TaxIdValidator } from '../tax-id-validator.js';
import { validateCif } from './es-cif.js';
import { validateCheckLetter } from './es-dni-nie.js';

interface StructureRule {
  readonly structure: RegExp;
  /** Every structure has 9 characters, so its parts are taken by position once the structure matches. */
  readonly validate: (value: string) => Result<TaxIdType, TaxIdReason>;
}

/** The NIE replaces its first letter by a digit (X → 0, Y → 1, Z → 2) and then follows the DNI algorithm (§3.3). */
const nieNumber = (value: string): string => `${String('XYZ'.indexOf(value.charAt(0)))}${value.slice(1, 8)}`;

/** Structures of 03-validacion-fiscal §3.1, in this order: the first that matches decides. */
const RULES: readonly StructureRule[] = [
  {
    structure: /^\d{8}[A-Z]$/,
    validate: (value) => validateCheckLetter(value.slice(0, 8), value.charAt(8), 'DNI'),
  },
  {
    structure: /^[XYZ]\d{7}[A-Z]$/,
    validate: (value) => validateCheckLetter(nieNumber(value), value.charAt(8), 'NIE'),
  },
  // NIF of K, L and M: a recognized structure that is not supported (D-12).
  { structure: /^[KLM]\d{7}[A-Z]$/, validate: () => err('UNSUPPORTED_TYPE') },
  // Keys of the Orden EHA/451/2008 (arts. 3–5) + 7 digits + a control of 0-9 or A-J.
  {
    structure: /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/,
    validate: (value) => validateCif(value.charAt(0), value.slice(1, 8), value.charAt(8)),
  },
];

function validateSpanishTaxId(value: string): Result<TaxIdType, TaxIdReason> {
  const rule = RULES.find(({ structure }) => structure.test(value));
  return rule ? rule.validate(value) : err('INVALID_FORMAT');
}

/** Spain: DNI, NIE and CIF with their check characters (RF-03). */
export const ES_VALIDATOR: TaxIdValidator = {
  country: 'ES',
  prefix: 'ES',
  types: Object.freeze(['DNI', 'NIE', 'CIF'] as const),
  validate: validateSpanishTaxId,
};
