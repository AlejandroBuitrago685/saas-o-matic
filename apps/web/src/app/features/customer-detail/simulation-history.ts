import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { Spinner } from '../../shared/ui/spinner';
import { CustomerDetailStore } from './customer-detail.store';
import { SimulationCard } from './simulation-card';

/**
 * History of a customer (spec 05 §3.5): newest first, 20 at a time with «Cargar más». An error here never
 * affects the simulator.
 */
@Component({
  selector: 'app-simulation-history',
  imports: [ErrorState, LoadingBlock, SimulationCard, Spinner],
  templateUrl: './simulation-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationHistory {
  protected readonly store = inject(CustomerDetailStore);
}
