import type { CreateCustomerRequest } from '@saas-o-matic/contract';
import { normalizeForSearch } from '@saas-o-matic/domain';

/** A simulation of the seed: `[activeUsers, storageGb, apiCallsPerMonth]`, the body of POST /simulations. */
export type SeedSimulation = readonly [activeUsers: number, storageGb: number, apiCallsPerMonth: number];

/** A customer of the seed, as the body of POST /customers, with the simulations created after it. */
export interface SeedCustomer {
  readonly customer: CreateCustomerRequest;
  readonly simulations: readonly SeedSimulation[];
}

interface DemoEntry {
  readonly name: string;
  readonly country: CreateCustomerRequest['country'];
  readonly taxId: string;
  readonly plan: CreateCustomerRequest['plan'];
  readonly simulations?: readonly SeedSimulation[];
}

/** `compras@acme-iberica-s-l.example`: fictitious, under the `.example` domain reserved by RFC 2606. */
function emailOf(name: string): string {
  const slug = normalizeForSearch(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `compras@${slug}.example`;
}

const demo = ({ name, country, taxId, plan, simulations = [] }: DemoEntry): SeedCustomer => ({
  customer: { companyName: name, country, taxId, plan, contactEmail: emailOf(name) },
  simulations,
});

/**
 * Profile `demo` (04-base-de-datos §7): the data of the README and of the public demo. 25 fictitious customers, so the
 * dashboard shows «1–20 de 25» (AC-28, AC-70), that cover the 7 countries and the 5 types of tax id. Every tax id is a
 * **synthetic** vector of 03-validacion-fiscal §5; the real ones (TV-ES-13 and TV-ES-31 to 34) are never used.
 * «Telefonía Ñandú S.A.» and «100% Digital S.L.» show the search without accents and with literal wildcards.
 */
export const DEMO_PROFILE: readonly SeedCustomer[] = [
  demo({
    name: 'Acme Ibérica S.L.',
    country: 'ES',
    taxId: 'B12345674',
    plan: 'BUSINESS',
    simulations: [
      [15, 250, 1_200_000],
      [51, 500, 2_000_000],
    ],
  }),
  demo({
    name: 'Telefonía Ñandú S.A.',
    country: 'ES',
    taxId: 'C12345674',
    plan: 'ENTERPRISE',
    simulations: [
      [250, 2_000, 50_000_000],
      [1_000, 10_000, 200_000_000],
      [2_500, 25_000, 500_000_000],
    ],
  }),
  demo({
    name: '100% Digital S.L.',
    country: 'ES',
    taxId: 'C1234567D',
    plan: 'STARTER',
    simulations: [[5, 20, 100_000]],
  }),
  demo({
    name: 'Cooperativa Olivares del Sur',
    country: 'ES',
    taxId: 'J00000000',
    plan: 'BUSINESS',
    simulations: [[30, 100, 0]],
  }),
  demo({ name: 'Fundación Brezo Azul', country: 'ES', taxId: 'Q1234567D', plan: 'STARTER' }),
  demo({
    name: 'Ingeniería Ébano y Cía. S.C.',
    country: 'ES',
    taxId: 'J0000000J',
    plan: 'BUSINESS',
    simulations: [[11, 50, 300_000]],
  }),
  demo({
    name: 'Logística Áurea Internacional',
    country: 'ES',
    taxId: 'N1234567D',
    plan: 'ENTERPRISE',
    simulations: [
      [400, 5_000, 80_000_000],
      [650, 8_000, 120_000_000],
    ],
  }),
  demo({ name: 'Delegación Nórdica Vela', country: 'ES', taxId: 'W1234567D', plan: 'BUSINESS' }),
  demo({
    name: 'Lucía Martín Estudio de Diseño',
    country: 'ES',
    taxId: '12345678Z',
    plan: 'STARTER',
    simulations: [[1, 0, 0]],
  }),
  demo({
    name: 'Javier Ortega Asesores',
    country: 'ES',
    taxId: '87654321X',
    plan: 'STARTER',
    simulations: [[3, 10, 5_000]],
  }),
  demo({ name: 'Óscar Núñez Fotografía', country: 'ES', taxId: '00000000T', plan: 'STARTER' }),
  demo({
    name: 'Kaito Tanaka Consultoría',
    country: 'ES',
    taxId: 'X1234567L',
    plan: 'BUSINESS',
    simulations: [[10, 40, 250_000]],
  }),
  demo({
    name: 'Amara Okafor Traducciones',
    country: 'ES',
    taxId: 'Y1234567X',
    plan: 'STARTER',
    simulations: [[2, 5, 1_000]],
  }),
  demo({
    name: 'Zofia Nowak Arquitectura',
    country: 'ES',
    taxId: 'Z1234567R',
    plan: 'BUSINESS',
    simulations: [
      [20, 300, 400_000],
      [45, 600, 900_000],
    ],
  }),
  demo({ name: 'Ivan Petrov Desarrollo Web', country: 'ES', taxId: 'X0000000T', plan: 'STARTER' }),
  demo({
    name: 'Lusoverde Energias, Lda.',
    country: 'PT',
    taxId: '123456789',
    plan: 'BUSINESS',
    simulations: [[75, 1_000, 3_000_000]],
  }),
  demo({
    name: 'Boulangerie Numérique SARL',
    country: 'FR',
    taxId: 'AB123456789',
    plan: 'STARTER',
    simulations: [[8, 30, 50_000]],
  }),
  demo({ name: 'Éditions Lumière SAS', country: 'FR', taxId: '1A123456789', plan: 'BUSINESS' }),
  demo({
    name: 'Müller & Schäfer GmbH',
    country: 'DE',
    taxId: '123456789',
    plan: 'ENTERPRISE',
    simulations: [
      [300, 4_000, 60_000_000],
      [500, 6_000, 90_000_000],
    ],
  }),
  demo({
    name: 'Caffè Dolomiti S.r.l.',
    country: 'IT',
    taxId: '12345678901',
    plan: 'BUSINESS',
    simulations: [[25, 150, 700_000]],
  }),
  demo({
    name: 'Thames Analytics Ltd',
    country: 'GB',
    taxId: '123456789',
    plan: 'ENTERPRISE',
    simulations: [[120, 2_500, 25_000_000]],
  }),
  demo({
    name: 'Bristol Cider Works plc',
    country: 'GB',
    taxId: '123456789012',
    plan: 'BUSINESS',
    simulations: [[40, 200, 1_500_000]],
  }),
  demo({ name: 'Oakridge Public Records Office', country: 'GB', taxId: 'GD123', plan: 'STARTER' }),
  demo({
    name: 'Brightline Robotics Inc.',
    country: 'US',
    taxId: '12-3456789',
    plan: 'ENTERPRISE',
    simulations: [
      [800, 15_000, 300_000_000],
      [1_200, 20_000, 450_000_000],
    ],
  }),
  demo({
    name: 'Redwood Data Labs LLC',
    country: 'US',
    taxId: '98-7654321',
    plan: 'BUSINESS',
    simulations: [[60, 800, 5_000_000]],
  }),
];
