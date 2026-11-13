import { httpResource } from '@angular/common/http';
import { computed, Injectable, type Signal } from '@angular/core';
import type { StatsResponse } from '@saas-o-matic/contract';

export type StatsState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly stats: StatsResponse };

/**
 * The dashboard metrics (spec 05 §3.1, RF-19, Could), read from GET /stats each time the dashboard opens, so a
 * customer or a simulation created meanwhile counts. Apart from the listing (D-162): a failure here never touches
 * the search, and the search never asks for the metrics again.
 */
@Injectable()
export class DashboardStatsStore {
  private readonly resource = httpResource<StatsResponse>(() => '/stats');

  readonly state: Signal<StatsState> = computed(() => {
    if (this.resource.hasValue()) return { status: 'ready', stats: this.resource.value() };
    return this.resource.error() === undefined ? { status: 'loading' } : { status: 'error' };
  });
}
