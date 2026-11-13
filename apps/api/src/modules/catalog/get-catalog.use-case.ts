import type { CatalogResponse } from '@saas-o-matic/contract';
import { CATALOG_LIMITS, COUNTRIES, PLANS, taxIdRulesFor, type Catalog } from '@saas-o-matic/domain';

export type GetCatalog = () => CatalogResponse;

/**
 * GET /catalog (RF-20): the catalog validated at startup, plus the prefix and types of each country's tax id from the
 * validators themselves (D-104) and the input limits of the domain (D-108). The catalog only changes with a deploy,
 * so the response is built once.
 */
export function createGetCatalog(catalog: Catalog): GetCatalog {
  const response: CatalogResponse = {
    countries: COUNTRIES.map((code) => {
      const { prefix, types } = taxIdRulesFor(code);
      return { code, taxRateBps: catalog.taxRateBps[code], taxIdTypes: [...types], taxIdPrefix: prefix };
    }),
    plans: PLANS.map((code) => ({ code, tariffCode: catalog.tariffByPlan[code].code })),
    tariffs: catalog.tariffs.map(({ code, tiers }) => ({
      code,
      currency: 'EUR',
      tiers: tiers.map((tier) => ({ ...tier })),
    })),
    limits: structuredClone(CATALOG_LIMITS),
  };
  return () => response;
}
