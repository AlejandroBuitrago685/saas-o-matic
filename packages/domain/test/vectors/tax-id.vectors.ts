// Test vectors of 02-especificacion/03-validacion-fiscal.md §5, copied as typed data with their ids. The last vector
// of §5.2 (33 characters → 400) belongs to the contract schema and is tested in P3; its id is not written here on
// purpose, or the traceability script would count it as covered.
import type { Country, TaxIdType } from '../../src/catalog/constants.js';
import type { TaxIdReason } from '../../src/tax-id/tax-id-validator.js';

export interface TaxIdVector {
  readonly id: string;
  readonly country: Country;
  readonly input: string;
  readonly expected:
    | { readonly valid: true; readonly value: string; readonly type: TaxIdType }
    | { readonly valid: false; readonly reason: TaxIdReason };
}

// Non-ASCII characters are built from their code points: written literally, a Cyrillic capital VE cannot be told apart
// from a Latin B in a review (D-96).
const char = (...codePoints: number[]): string => String.fromCodePoint(...codePoints);
const NO_BREAK_SPACE = char(0x00a0);
const CYRILLIC_CAPITAL_VE = char(0x0412);
const FULLWIDTH_12345678 = char(0xff11, 0xff12, 0xff13, 0xff14, 0xff15, 0xff16, 0xff17, 0xff18);
const LATIN_SMALL_LONG_S = char(0x017f);
const EN_DASH = char(0x2013);

const valid = (value: string, type: TaxIdType): TaxIdVector['expected'] => ({ valid: true, value, type });
const invalid = (reason: TaxIdReason): TaxIdVector['expected'] => ({ valid: false, reason });
const vectorsOf =
  (country: Country) =>
  (id: string, input: string, expected: TaxIdVector['expected']): TaxIdVector => ({
    id,
    country,
    input,
    expected,
  });
const es = vectorsOf('ES');

/** §5.1 Spain. */
export const SPAIN_VECTORS: readonly TaxIdVector[] = [
  es('TV-ES-01', '12345678Z', valid('12345678Z', 'DNI')),
  es('TV-ES-02', '87654321X', valid('87654321X', 'DNI')),
  es('TV-ES-03', '00000000T', valid('00000000T', 'DNI')),
  es('TV-ES-04', '12345678A', invalid('INVALID_CHECK')),
  es('TV-ES-05', '12345678I', invalid('INVALID_CHECK')),
  es('TV-ES-06', '1234567L', invalid('INVALID_FORMAT')),
  es('TV-ES-07', '123456789', invalid('INVALID_FORMAT')),
  es('TV-ES-08', 'X1234567L', valid('X1234567L', 'NIE')),
  es('TV-ES-09', 'Y1234567X', valid('Y1234567X', 'NIE')),
  es('TV-ES-10', 'Z1234567R', valid('Z1234567R', 'NIE')),
  es('TV-ES-11', 'X0000000T', valid('X0000000T', 'NIE')),
  es('TV-ES-12', 'X1234567A', invalid('INVALID_CHECK')),
  es('TV-ES-13', 'Q2826000H', valid('Q2826000H', 'CIF')),
  es('TV-ES-14', 'W1234567D', valid('W1234567D', 'CIF')),
  es('TV-ES-15', 'W1234567L', invalid('INVALID_FORMAT')),
  es('TV-ES-16', 'B12345674', valid('B12345674', 'CIF')),
  es('TV-ES-17', 'B1234567D', invalid('INVALID_CHECK')),
  es('TV-ES-18', 'B12345675', invalid('INVALID_CHECK')),
  es('TV-ES-19', 'Q1234567D', valid('Q1234567D', 'CIF')),
  es('TV-ES-20', 'Q12345674', invalid('INVALID_CHECK')),
  es('TV-ES-21', 'C12345674', valid('C12345674', 'CIF')),
  es('TV-ES-22', 'C1234567D', valid('C1234567D', 'CIF')),
  es('TV-ES-23', 'J00000000', valid('J00000000', 'CIF')),
  es('TV-ES-24', 'J0000000J', valid('J0000000J', 'CIF')),
  es('TV-ES-25', 'N1234567D', valid('N1234567D', 'CIF')),
  es('TV-ES-26', 'N12345674', invalid('INVALID_CHECK')),
  es('TV-ES-27', 'I1234567D', invalid('INVALID_FORMAT')),
  es('TV-ES-27', 'O1234567D', invalid('INVALID_FORMAT')),
  es('TV-ES-27', 'T1234567D', invalid('INVALID_FORMAT')),
  es('TV-ES-28', 'K1234567L', invalid('UNSUPPORTED_TYPE')),
  es('TV-ES-28', 'L1234567L', invalid('UNSUPPORTED_TYPE')),
  es('TV-ES-28', 'M1234567L', invalid('UNSUPPORTED_TYPE')),
  es('TV-ES-29', 'B1234567', invalid('INVALID_FORMAT')),
  es('TV-ES-30', 'AB123456789', invalid('INVALID_FORMAT')),
  es('TV-ES-31', 'A28015865', valid('A28015865', 'CIF')), // Telefónica, S.A.
  es('TV-ES-32', 'A15075062', valid('A15075062', 'CIF')), // Inditex
  es('TV-ES-33', 'A46103834', valid('A46103834', 'CIF')), // Mercadona, S.A.
  es('TV-ES-34', 'A39000013', valid('A39000013', 'CIF')), // Banco Santander, S.A.
];

/** §5.2 Normalization (all with country ES). */
export const NORMALIZATION_VECTORS: readonly TaxIdVector[] = [
  es('TV-NO-01', ' 12.345.678-z ', valid('12345678Z', 'DNI')),
  es('TV-NO-02', `12345678${NO_BREAK_SPACE}Z`, valid('12345678Z', 'DNI')),
  es('TV-NO-03', 'ES12345678Z', valid('12345678Z', 'DNI')),
  es('TV-NO-04', 'esb12345674', valid('B12345674', 'CIF')),
  es('TV-NO-05', 'ES B-1234567-4', valid('B12345674', 'CIF')),
  es('TV-NO-06', 'ESB12345675', invalid('INVALID_CHECK')),
  es('TV-NO-07', `${CYRILLIC_CAPITAL_VE}12345674`, invalid('INVALID_FORMAT')),
  es('TV-NO-08', `${FULLWIDTH_12345678}Z`, invalid('INVALID_FORMAT')),
  es('TV-NO-09', `e${LATIN_SMALL_LONG_S}B12345674`, invalid('INVALID_FORMAT')),
  es('TV-NO-10', `12345678${EN_DASH}Z`, invalid('INVALID_FORMAT')),
  es('TV-NO-11', ' -. ', invalid('INVALID_FORMAT')),
];

const pt = vectorsOf('PT');
const de = vectorsOf('DE');
const it = vectorsOf('IT');
const fr = vectorsOf('FR');
const gb = vectorsOf('GB');
const us = vectorsOf('US');

/** §5.3 Other countries. */
export const OTHER_COUNTRY_VECTORS: readonly TaxIdVector[] = [
  pt('TV-INT-01', '123456789', valid('123456789', 'VAT')),
  pt('TV-INT-02', 'PT 123 456 789', valid('123456789', 'VAT')),
  pt('TV-INT-03', '12345678', invalid('INVALID_FORMAT')),
  pt('TV-INT-04', '1234567890', invalid('INVALID_FORMAT')),
  de('TV-INT-05', '123456789', valid('123456789', 'VAT')),
  de('TV-INT-06', 'DE123456789', valid('123456789', 'VAT')),
  de('TV-INT-07', '12345678X', invalid('INVALID_FORMAT')),
  it('TV-INT-08', '12345678901', valid('12345678901', 'VAT')),
  it('TV-INT-09', 'IT12345678901', valid('12345678901', 'VAT')),
  it('TV-INT-10', '1234567890', invalid('INVALID_FORMAT')),
  fr('TV-INT-11', '12345678901', valid('12345678901', 'VAT')),
  fr('TV-INT-12', 'AB123456789', valid('AB123456789', 'VAT')),
  fr('TV-INT-13', '1A123456789', valid('1A123456789', 'VAT')),
  fr('TV-INT-14', 'FRAB123456789', valid('AB123456789', 'VAT')),
  fr('TV-INT-15', 'FR123456789', valid('FR123456789', 'VAT')),
  fr('TV-INT-16', 'IA123456789', invalid('INVALID_FORMAT')),
  fr('TV-INT-16', 'OA123456789', invalid('INVALID_FORMAT')),
  fr('TV-INT-17', '1234567890', invalid('INVALID_FORMAT')),
  gb('TV-INT-18', '123456789', valid('123456789', 'VAT')),
  gb('TV-INT-19', 'GB 123 4567 89', valid('123456789', 'VAT')),
  gb('TV-INT-20', '123456789012', valid('123456789012', 'VAT')),
  gb('TV-INT-21', 'GD123', valid('GD123', 'VAT')),
  gb('TV-INT-21', 'HA567', valid('HA567', 'VAT')),
  gb('TV-INT-22', '12345678', invalid('INVALID_FORMAT')),
  gb('TV-INT-23', 'GD1234', invalid('INVALID_FORMAT')),
  gb('TV-INT-24', 'XI123456789', invalid('INVALID_FORMAT')),
  us('TV-INT-25', '12-3456789', valid('123456789', 'EIN')),
  us('TV-INT-26', '98-7654321', valid('987654321', 'EIN')),
  us('TV-INT-27', '00-1234567', invalid('INVALID_FORMAT')),
  us('TV-INT-28', '07-1234567', invalid('INVALID_FORMAT')),
  us('TV-INT-29', '12345678', invalid('INVALID_FORMAT')),
  us('TV-INT-30', 'US123456789', invalid('INVALID_FORMAT')),
  fr('TV-INT-31', '12345678Z', invalid('INVALID_FORMAT')),
];

export const ALL_TAX_ID_VECTORS: readonly TaxIdVector[] = [
  ...SPAIN_VECTORS,
  ...NORMALIZATION_VECTORS,
  ...OTHER_COUNTRY_VECTORS,
];
