import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, linkedSignal, type Signal } from '@angular/core';
import type { CustomerResponse, SimulationPage, SimulationResponse } from '@saas-o-matic/contract';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

/** Simulations per page of the history (spec 05 §3.5). */
export const HISTORY_PAGE_SIZE = 20;

export type CustomerStatus = 'loading' | 'not-found' | 'error' | 'ready';
export type HistoryStatus = 'loading' | 'error' | 'ready';
export type LoadMoreStatus = 'idle' | 'loading' | 'error';

function statusOf(resource: { hasValue(): boolean; error(): unknown }): 'loading' | 'error' | 'ready' {
  if (resource.hasValue()) return 'ready';
  return resource.error() === undefined ? 'loading' : 'error';
}

/**
 * Customer and simulation history of the detail view (06-frontend §3), one per page. The customer and the first
 * page of the history load in parallel; «Cargar más» appends pages, and a saved simulation goes first with the
 * amounts of the server's response (AC-78). Everything resets when the route id changes.
 */
@Injectable()
export class CustomerDetailStore {
  private readonly http = inject(HttpClient);
  private source: (() => string) | undefined;

  private readonly id = computed(() => {
    if (this.source === undefined) throw new Error('CustomerDetailStore.connect() was not called');
    return this.source();
  });

  private readonly customerResource = httpResource<CustomerResponse>(
    () => `/customers/${encodeURIComponent(this.id())}`,
  );
  private readonly firstPage = httpResource<SimulationPage>(() => ({
    url: `/customers/${encodeURIComponent(this.id())}/simulations`,
    params: { limit: HISTORY_PAGE_SIZE, offset: 0 },
  }));
  private readonly olderPages = linkedSignal<string, readonly SimulationResponse[]>({
    source: this.id,
    computation: () => [],
  });
  private readonly savedHere = linkedSignal<string, readonly SimulationResponse[]>({
    source: this.id,
    computation: () => [],
  });
  private readonly moreStatus = linkedSignal<string, LoadMoreStatus>({
    source: this.id,
    computation: () => 'idle',
  });

  /** `/customers/abc` is a 400 and an unknown UUID a 404: both are «Cliente no encontrado» (AC-75, CL-49). */
  readonly customerStatus: Signal<CustomerStatus> = computed(() => {
    const status = statusOf(this.customerResource);
    const error = this.customerResource.error();
    const isNotFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return status === 'error' && isNotFound ? 'not-found' : status;
  });
  readonly customer: Signal<CustomerResponse | undefined> = computed(() =>
    this.customerResource.hasValue() ? this.customerResource.value() : undefined,
  );

  readonly historyStatus: Signal<HistoryStatus> = computed(() => statusOf(this.firstPage));
  private readonly serverItems = computed(() => [
    ...(this.firstPage.hasValue() ? this.firstPage.value().items : []),
    ...this.olderPages(),
  ]);
  /** Saved here and not yet in a page from the server: a reload or another tab may already include them. */
  private readonly onlyHere = computed(() => {
    const fromServer = new Set(this.serverItems().map(({ id }) => id));
    return this.savedHere().filter(({ id }) => !fromServer.has(id));
  });
  readonly simulations: Signal<readonly SimulationResponse[]> = computed(() => [
    ...this.onlyHere(),
    ...this.serverItems(),
  ]);
  readonly total = computed(
    () => (this.firstPage.hasValue() ? this.firstPage.value().page.total : 0) + this.onlyHere().length,
  );
  readonly hasMore = computed(() => this.simulations().length < this.total());
  readonly loadMoreStatus: Signal<LoadMoreStatus> = this.moreStatus.asReadonly();

  /** The page passes its route input once, in its constructor; it is read lazily, so it stays reactive. */
  connect(source: () => string): void {
    this.source = source;
  }

  reloadCustomer(): void {
    this.customerResource.reload();
    this.firstPage.reload();
  }

  /** Starts the history again from the server: what was saved here is already in its first page. */
  reloadHistory(): void {
    this.savedHere.set([]);
    this.olderPages.set([]);
    this.moreStatus.set('idle');
    this.firstPage.reload();
  }

  async loadMore(): Promise<void> {
    if (this.moreStatus() === 'loading' || !this.hasMore()) return;
    const id = this.id();
    this.moreStatus.set('loading');
    try {
      const page = await firstValueFrom(
        this.http.get<SimulationPage>(`/customers/${encodeURIComponent(id)}/simulations`, {
          params: { limit: HISTORY_PAGE_SIZE, offset: this.simulations().length },
        }),
      );
      if (id !== this.id()) return; // the user went to another customer meanwhile
      this.olderPages.update((older) => [...older, ...page.items]);
      this.moreStatus.set('idle');
    } catch {
      if (id === this.id()) this.moreStatus.set('error');
    }
  }

  /** A simulation just saved goes first, with the amounts the server returned. */
  prepend(simulation: SimulationResponse): void {
    this.savedHere.update((saved) => [simulation, ...saved]);
  }
}
