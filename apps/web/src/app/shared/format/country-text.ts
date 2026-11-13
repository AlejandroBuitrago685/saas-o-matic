import type { Country } from '@saas-o-matic/domain';

/** Country names shown in the interface (spec 05 §3.1, D-35). Not business data: only visible text. */
export const COUNTRY_NAMES = {
  ES: 'España',
  PT: 'Portugal',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  GB: 'Reino Unido',
  US: 'Estados Unidos',
} as const satisfies Record<Country, string>;

export interface TaxIdFieldText {
  /** Label of the tax id field, which also names the accepted types in error messages. */
  readonly label: string;
  readonly example: string;
}

/** Label and help example of the tax id field per country (spec 05 §3.2). */
export const TAX_ID_FIELD_TEXT = {
  ES: { label: 'DNI, NIE o CIF', example: 'B12345674' },
  PT: { label: 'NIF (NIPC)', example: '123456789' },
  FR: { label: 'Número de IVA intracomunitario', example: 'AB123456789' },
  DE: { label: 'USt-IdNr.', example: '123456789' },
  IT: { label: 'Partita IVA', example: '12345678901' },
  GB: { label: 'VAT registration number', example: '123456789' },
  US: { label: 'EIN', example: '12-3456789' },
} as const satisfies Record<Country, TaxIdFieldText>;
