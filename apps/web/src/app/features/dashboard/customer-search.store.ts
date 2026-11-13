import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal, type Signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, Router } from '@angular/router';
import type { CustomerPage, CustomerSummary } from '@saas-o-matic/contract';
import { tap } from 'rxjs';

import {
  isCanonical,
  isSameSearch,
  readSearchState,
  SEARCH_PAGE_SIZE,
  searchQueryParams,
  type SearchState,
} from './search-url';
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
 * - The query and the page are also in the URL (spec 05 §3.1, Should; D-163), so a reload or coming back from a
 *   detail keeps them. The signals answer at once and the URL follows, replacing its entry (`replaceUrl`): the
 *   history keeps one entry per visit to the dashboard. A change of the URL from outside (the «Clientes» link, a
 *   link with a query) is adopted, and an invalid one is corrected.
 */
@Injectable()
export class CustomerSearchStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private timer: ReturnType<typeof setTimeout> | undefined;
  /**
   * The states the store wrote to the URL and has not seen back yet, oldest first. An emission equal to one of them
   * that is no longer the current state is an old navigation of the store's own, never news (review of P10): the
   * decision depends on the states, not on when the router resolves its promises.
   */
  private readonly pendingWrites: SearchState[] = [];

  private readonly initial = readSearchState(this.route.snapshot.queryParamMap);
  private readonly text = signal(this.initial.query);
  private readonly query = signal(this.initial.query);
  private readonly pageIndex = signal(this.initial.pageIndex);
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
            this.leavePageBeyondTheEnd(page);
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
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.followUrl(params);
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
    if (this.hasNext() && !this.isRefreshing()) this.goTo(this.query(), this.pageIndex() + 1);
  }

  previous(): void {
    if (this.hasPrevious() && !this.isRefreshing()) this.goTo(this.query(), this.pageIndex() - 1);
  }

  retry(): void {
    this.result.reload();
  }

  /** Back to the first page whenever the query changes (06-frontend §3, point 4); the same query changes nothing. */
  private apply(): void {
    const query = this.text().trim();
    if (query !== this.query()) this.goTo(query, 0);
  }

  private goTo(query: string, pageIndex: number): void {
    this.query.set(query);
    this.pageIndex.set(pageIndex);
    this.writeUrl({ query, pageIndex });
  }

  private writeUrl(state: SearchState): void {
    this.pendingWrites.push(state);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: searchQueryParams(state),
      replaceUrl: true,
    });
  }

  /** The URL changed: adopt what someone else put there, and correct it if it is not valid or not canonical. */
  private followUrl(params: ParamMap): void {
    const state = readSearchState(params);
    if (isSameSearch(state, { query: this.query(), pageIndex: this.pageIndex() })) {
      this.pendingWrites.length = 0; // The URL caught up with the store: nothing of its own is still on the way.
    } else if (!this.isOwnOlderWrite(state)) {
      this.cancelDebounce();
      this.text.set(state.query);
      this.query.set(state.query);
      this.pageIndex.set(state.pageIndex);
    }
    if (!isCanonical(params, state)) this.writeUrl(state);
  }

  /** Whether `state` is an older write of the store arriving late; it and the ones before it are then forgotten. */
  private isOwnOlderWrite(state: SearchState): boolean {
    const index = this.pendingWrites.findIndex((written) => isSameSearch(written, state));
    if (index === -1) return false;
    this.pendingWrites.splice(0, index + 1);
    return true;
  }

  /** A page past the end (an old link, customers removed meanwhile) shows the last page instead of nothing. */
  private leavePageBeyondTheEnd({ items, page }: CustomerPage): void {
    if (items.length > 0 || page.total === 0 || page.offset === 0) return;
    this.goTo(this.query(), Math.ceil(page.total / SEARCH_PAGE_SIZE) - 1);
  }

  private cancelDebounce(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
