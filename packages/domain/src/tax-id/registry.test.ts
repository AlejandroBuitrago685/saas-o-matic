import { describe, expect, it } from 'vitest';

import { ALL_TAX_ID_VECTORS } from '../../test/vectors/tax-id.vectors.js';
import { COUNTRIES } from '../catalog/constants.js';
import { TAX_ID_VALIDATORS, taxIdRulesFor } from './registry.js';
import { validateTaxId } from './validate-tax-id.js';
import { US_EIN_PREFIXES } from './validators/us-ein-prefixes.js';

describe('AC-16 one tax id validator per country of the catalog (RNF-26, D-15, D-100)', () => {
  it('the registry has exactly the countries of the catalog, no more and no less', () => {
    expect(Object.keys(TAX_ID_VALIDATORS).sort()).toEqual([...COUNTRIES].sort());
  });

  it('each validator is registered under its own country', () => {
    for (const country of COUNTRIES) expect(TAX_ID_VALIDATORS[country].country).toBe(country);
  });

  it('declares the optional country prefix of 03-validacion-fiscal §1 (none for the US)', () => {
    const prefixes = Object.fromEntries(
      COUNTRIES.map((country) => [country, TAX_ID_VALIDATORS[country].prefix]),
    );

    expect(prefixes).toEqual({ ES: 'ES', PT: 'PT', FR: 'FR', DE: 'DE', IT: 'IT', GB: 'GB', US: null });
  });
});

describe('AC-16 the catalog publishes each country tax id rules from its validator (04-contrato-api §3.1, ADR-005)', () => {
  it('gives the prefix and types of the GET /catalog example', () => {
    const rules = Object.fromEntries(COUNTRIES.map((country) => [country, taxIdRulesFor(country)]));

    expect(rules).toEqual({
      ES: { prefix: 'ES', types: ['DNI', 'NIE', 'CIF'] },
      PT: { prefix: 'PT', types: ['VAT'] },
      FR: { prefix: 'FR', types: ['VAT'] },
      DE: { prefix: 'DE', types: ['VAT'] },
      IT: { prefix: 'IT', types: ['VAT'] },
      GB: { prefix: 'GB', types: ['VAT'] },
      US: { prefix: null, types: ['EIN'] },
    });
  });

  it.each(ALL_TAX_ID_VECTORS.filter((vector) => vector.expected.valid))(
    '$id: the type of a valid id is one of the types its country declares',
    (vector) => {
      const result = validateTaxId(vector.input, vector.country);

      expect(result.ok && taxIdRulesFor(vector.country).types.includes(result.value.type)).toBe(true);
    },
  );
});

describe('AC-15 the 83 valid EIN prefixes of the IRS, and none of the 17 that are not (03-validacion-fiscal §4, D-103)', () => {
  // Copied literally from the specification, independently of the list in the code.
  const NOT_VALID = '00 07 08 09 17 18 19 28 29 49 69 70 78 79 89 96 97'.split(' ');
  const ALL_TWO_DIGIT = Array.from({ length: 100 }, (_v, n) => String(n).padStart(2, '0'));

  it('has 83 prefixes, and with the 17 not valid they cover the 100 two-digit prefixes exactly once', () => {
    expect(US_EIN_PREFIXES.size).toBe(83);
    expect(NOT_VALID.filter((prefix) => US_EIN_PREFIXES.has(prefix))).toEqual([]);
    expect(ALL_TWO_DIGIT.filter((prefix) => !US_EIN_PREFIXES.has(prefix))).toEqual(NOT_VALID);
  });
});
