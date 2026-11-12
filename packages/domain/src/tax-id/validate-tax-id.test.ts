import { describe, expect, it } from 'vitest';

import {
  NORMALIZATION_VECTORS,
  OTHER_COUNTRY_VECTORS,
  SPAIN_VECTORS,
  type TaxIdVector,
} from '../../test/vectors/tax-id.vectors.js';
import { validateTaxId } from './validate-tax-id.js';

function check(vector: TaxIdVector): void {
  const { expected } = vector;
  const result = validateTaxId(vector.input, vector.country);

  expect(result).toEqual(
    expected.valid
      ? { ok: true, value: { value: expected.value, type: expected.type } }
      : { ok: false, error: expected.reason },
  );
}

/** Spanish vectors whose number (TV-ES-NN) is in the given list. */
const spain = (...numbers: number[]): TaxIdVector[] =>
  SPAIN_VECTORS.filter((vector) => numbers.includes(Number(vector.id.slice(-2))));
const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_v, i) => from + i);

describe('AC-10 DNI (RF-03, CL-18, CL-19)', () => {
  it.each(spain(...range(1, 7)))('$id: $input', check);
});

describe('AC-11 NIE (RF-03, CL-20)', () => {
  it.each(spain(...range(8, 12)))('$id: $input', check);
});

describe('AC-12 CIF, including the real NIFs of the AEAT and four listed companies (RF-03, D-13, D-50)', () => {
  it.each(spain(...range(13, 27), 29, ...range(31, 34)))('$id: $input', check);
});

describe('AC-13 special NIF K, L and M are not supported, even with a correct check character (D-12)', () => {
  it.each(spain(28))('$id: $input', check);
});

describe('AC-14 normalization: spaces, dots, hyphens, case and country prefix; no Unicode homoglyph (RF-02)', () => {
  it.each(NORMALIZATION_VECTORS)('$id: $input', check);
});

describe('AC-15 formats per country, with their type and normalized value (RF-02, CL-27, CL-52–54)', () => {
  it.each([...OTHER_COUNTRY_VECTORS, ...spain(30)])('$id: $country $input', check);
});
