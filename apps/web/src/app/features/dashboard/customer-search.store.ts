import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, linkedSignal, signal, type Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { CustomerPage, CustomerSummary } from '@saas-o-matic/contract';
import { tap } from 'rxjs';

/** Customers per page of the dashboard (spec 05 §3.1). */
export const SEARCH_PAGE_SIZE = 20;
/** The search starts this long after the last key, or at once with Enter (spec 05 §3.1, AC-71). */
export const SEARCH_DEBOUNCE_MS = 300;

export type DashboardStatus = 'loading' | 'error' | 'empty' | 'no-matches' | 'ready';

export interface PageRange {
  readonly from: number;
  readonly to: number;
  readonly total: number;
}

/** A page of the API and the query it answers: «no matches» names the query of its own answer. */
interface Shown {
  readonly page: CustomerPage;
  readonly query: string;
}

interface PageQuery {
  readonly query: string;
  readonly offset: number;
}

/**
 * Search and listing of the dashboard (06-frontend §3), one per page. What the user types and the query that is
 * searched are apart: the query follows the text 300 ms after the last key, or at once with Enter.
 * - `rxResource` unsubscribes from the request of an older query when a newer one starts, which cancels it: a slow
 *   answer never replaces a newer list (CL-42).
 * - The last answer is kept when it arrives, so it stays on screen, dimmed, while the next one loads. A resource
 *   forgets its value as soon as its parameters change, and a `linkedSignal` over it only remembers what was read.
 */
@Injectable()
export class CustomerSearchStore {
  private readonly http = inject(HttpClient);
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly text = signal('');
  private readonly query = signal('');
  /** Back to the first page whenever the query changes (06-frontend §3, point 4). */
  private readonly pageIndex = linkedSignal<string, number>({ source: this.query, computation: () => 0 });
  private readonly shown = signal<Shown | undefined>(undefined);

  private readonly result = rxResource<CustomerPage, PageQuery>({
    params: () => ({ query: this.query(), offset: this.pageIndex() * SEARCH_PAGE_SIZE }),
    stream: ({ params: { query, offset } }) =>
      this.http
        .get<CustomerPage>('/customers', {
          params: { ...(query === '' ? {} : { q: query }), limit: SEARCH_PAGE_SIZE, offset },
        })
        .pipe(
          tap((page) => {
            this.shown.set({ page, query });
          }),
        ),
  });

  readonly input: Signal<string> = this.text.asReadonly();
  readonly shownQuery: Signal<string> = computed(() => this.shown()?.query ?? '');
  readonly items: Signal<readonly CustomerSummary[]> = computed(() => this.shown()?.page.items ?? []);
  readonly isRefreshing: Signal<boolean> = computed(
    () => this.result.isLoading() && this.shown() !== undefined,
  );

  readonly status: Signal<DashboardStatus> = computed(() => {
    if (this.result.error() !== undefined) return 'error';
    const shown = this.shown();
    if (shown === undefined) return 'loading';
    if (shown.page.page.total > 0) return 'ready';
    return shown.query === '' ? 'empty' : 'no-matches';
  });

  readonly range: Signal<PageRange> = computed(() => {
    const page = this.shown()?.page;
    const offset = page?.page.offset ?? 0;
    return { from: offset + 1, to: offset + this.items().length, total: page?.page.total ?? 0 };
  });
  readonly hasPrevious: Signal<boolean> = computed(() => this.range().from > 1);
  readonly hasNext: Signal<boolean> = computed(() => this.range().to < this.range().total);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelDebounce();
    });
  }

  /** What the user typed; the search follows when they stop for 300 ms. */
  type(text: string): void {
    this.text.set(text);
    this.cancelDebounce();
    this.timer = setTimeout(() => {
      this.apply();
    }, SEARCH_DEBOUNCE_MS);
  }

  /** Enter: search now. */
  submit(): void {
    this.cancelDebounce();
    this.apply();
  }

  /** «Limpiar búsqueda» and the clear button of the field: everything again. */
  clear(): void {
    this.text.set('');
    this.submit();
  }

  /** Ignored while a page loads: `hasNext` still describes the page on screen, so a second click would skip one. */
  next(): void {
    if (this.hasNext() && !this.isRefreshing()) this.pageIndex.update((index) => index + 1);
  }

  previous(): void {
    if (this.hasPrevious() && !this.isRefreshing()) this.pageIndex.update((index) => index - 1);
  }

  retry(): void {
    this.result.reload();
  }

  private apply(): void {
    this.query.set(this.text().trim());
  }

  private cancelDebounce(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
