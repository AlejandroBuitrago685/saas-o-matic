import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { CustomerResponse } from '@saas-o-matic/contract';

import { CatalogStore } from '../../core/catalog/catalog.store';
import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { Simulator } from '../simulator/simulator';
import { CustomerCard } from './customer-card';
import { CustomerDetailStore } from './customer-detail.store';
import { SimulationHistory } from './simulation-history';

/**
 * Layout of a loaded customer (spec 05 §3.3): one column on phones; from 1024 px customer and simulator side by
 * side and the history below, full width. The simulator waits for the catalog, which holds tariffs and taxes.
 */
@Component({
  selector: 'app-customer-overview',
  imports: [CustomerCard, ErrorState, LoadingBlock, SimulationHistory, Simulator],
  template: `
    <div class="flex flex-col gap-8">
      <div class="flex flex-col gap-1">
        <p class="text-small font-semibold text-ink-muted">Cliente</p>
        <h1 class="page-title wrap-anywhere">{{ customer().companyName }}</h1>
      </div>
      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <app-customer-card [customer]="customer()" />
        @if (catalog.ready(); as ready) {
          <app-simulator [customer]="customer()" [catalog]="ready" (saved)="store.prepend($event)" />
        } @else if (catalog.state().status === 'error') {
          <app-error-state
            message="No se ha podido cargar el catálogo de tarifas. Sin él no se puede simular."
            (retry)="catalog.reload()"
          />
        } @else {
          <div class="card"><app-loading-block label="Cargando el simulador…" [lines]="5" /></div>
        }
      </div>
      <app-simulation-history />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerOverview {
  readonly customer = input.required<CustomerResponse>();

  protected readonly catalog = inject(CatalogStore);
  protected readonly store = inject(CustomerDetailStore);
}
