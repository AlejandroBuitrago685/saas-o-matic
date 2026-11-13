import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CurrencyStore } from '../../core/currency/currency.store';

import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { Spinner } from '../../shared/ui/spinner';
import { CustomerDetailStore } from './customer-detail.store';
import { SimulationCard } from './simulation-card';

/**
 * History of a customer (spec 05 §3.5): newest first, 20 at a time with «Cargar más». An error here never
 * affects the simulator. Outside EUR the amounts use today's rates, and the history says so (D-19).
 */
@Component({
  selector: 'app-simulation-history',
  imports: [ErrorState, LoadingBlock, SimulationCard, Spinner],
  templateUrl: './simulation-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationHistory {
  protected readonly store = inject(CustomerDetailStore);
  private readonly currency = inject(CurrencyStore);
  /** Hidden rather than removed: the template stays within its complexity limit. */
  protected readonly hasConversionNote = computed(
    () =>
      this.currency.effective() !== 'EUR' &&
      this.store.historyStatus() === 'ready' &&
      this.store.simulations().length > 0,
  );
}
