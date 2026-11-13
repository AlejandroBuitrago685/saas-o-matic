import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Spinner } from '../../shared/ui/spinner';
import { CustomerSearchStore } from './customer-search.store';
import { CustomerSummaryCard } from './customer-summary-card';

/**
 * The cards of a page and its pagination: «Anterior», «1–20 de 25» and «Siguiente» (spec 05 §3.1). The buttons wait
 * while a page loads, so two clicks never skip one. It reads the store of the dashboard, its only parent.
 */
@Component({
  selector: 'app-customer-results',
  imports: [CustomerSummaryCard, Spinner],
  templateUrl: './customer-results.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerResults {
  protected readonly store = inject(CustomerSearchStore);

  protected readonly rangeText = computed(() => {
    const { from, to, total } = this.store.range();
    return `${String(from)}–${String(to)} de ${String(total)}`;
  });
  protected readonly canGoBack = computed(() => this.store.hasPrevious() && !this.store.isRefreshing());
  protected readonly canGoForward = computed(() => this.store.hasNext() && !this.store.isRefreshing());
}
