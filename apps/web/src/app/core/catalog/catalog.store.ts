import { httpResource } from '@angular/common/http';
import { computed, Injectable, type Signal } from '@angular/core';
import type { CatalogResponse } from '@saas-o-matic/contract';
import { type Catalog, validateCatalog } from '@saas-o-matic/domain';

import { ApiError } from '../api/api-error';

/** The catalog as the interface uses it: the API response (limits, labels) and its validated domain form. */
export interface ReadyCatalog {
  readonly response: CatalogResponse;
  readonly catalog: Catalog;
}

export type CatalogState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiError | undefined }
  | ({ readonly status: 'ready' } & ReadyCatalog);

/**
 * Business data of the interface (RF-20): countries, tax rates, plans, tariffs and limits, read once from
 * GET /catalog. The tariffs are validated with the same domain code as the API, because `calculatePricing` only
 * accepts a validated tariff (D-95, ADR-008). A catalog that does not validate is an error, never a guess.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly resource = httpResource<CatalogResponse>(() => '/catalog');

  readonly state: Signal<CatalogState> = computed(() => {
    if (this.resource.hasValue()) {
      const response = this.resource.value();
      const validated = validateCatalog(response);
      return validated.ok
        ? { status: 'ready', response, catalog: validated.value }
        : { status: 'error', error: undefined };
    }
    const error = this.resource.error();
    return error === undefined
      ? { status: 'loading' }
      : { status: 'error', error: error instanceof ApiError ? error : undefined };
  });

  /** The catalog when it is ready, for views that only render once it is. */
  readonly ready: Signal<ReadyCatalog | undefined> = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? { response: state.response, catalog: state.catalog } : undefined;
  });

  reload(): void {
    this.resource.reload();
  }
}
