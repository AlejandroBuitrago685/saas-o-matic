import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ErrorState } from '../../shared/ui/error-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { NotFoundView } from '../../shared/ui/not-found-view';
import { CustomerDetailStore } from './customer-detail.store';
import { CustomerOverview } from './customer-overview';

/** V3 · Detalle del cliente (spec 05 §3.3), with the simulator (V4) and the history. */
@Component({
  selector: 'app-customer-detail-page',
  imports: [CustomerOverview, ErrorState, LoadingBlock, NotFoundView],
  providers: [CustomerDetailStore],
  template: `
    @switch (store.customerStatus()) {
      @case ('ready') {
        @if (store.customer(); as customer) {
          <app-customer-overview [customer]="customer" />
        }
      }
      @case ('not-found') {
        <app-not-found-view title="Cliente no encontrado" />
      }
      @case ('error') {
        <app-error-state message="No se ha podido cargar el cliente." (retry)="store.reloadCustomer()" />
      }
      @case ('loading') {
        <div role="status" aria-busy="true" class="flex flex-col gap-6">
          <span class="sr-only">Cargando el cliente…</span>
          <div class="skeleton h-8 w-2/3" aria-hidden="true"></div>
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div class="card"><app-loading-block [announce]="false" [lines]="5" /></div>
            <div class="card"><app-loading-block [announce]="false" [lines]="5" /></div>
          </div>
          <div class="card"><app-loading-block [announce]="false" /></div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailPage {
  /** Route parameter `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly store = inject(CustomerDetailStore);

  constructor() {
    this.store.connect(() => this.id());
  }
}
