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
        <!-- Framed like the not-found view, with the page title: the error is the whole page here. -->
        <section class="card mx-auto flex max-w-xl flex-col gap-4" aria-labelledby="customer-error-title">
          <h1 id="customer-error-title" class="page-title">Cliente</h1>
          <app-error-state message="No se ha podido cargar el cliente." (retry)="store.reloadCustomer()" />
        </section>
      }
      @case ('loading') {
        <!-- The shape of the loaded page (D-191): customer, controls and total, then the history. -->
        <div role="status" aria-busy="true" class="flex flex-col gap-8">
          <span class="sr-only">Cargando el cliente…</span>
          <div class="flex flex-col gap-2" aria-hidden="true">
            <div class="skeleton h-4 w-16"></div>
            <div class="skeleton h-10 w-2/3"></div>
          </div>
          <div
            class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[29fr_38fr_33fr]"
          >
            <div class="card"><app-loading-block [announce]="false" [lines]="5" /></div>
            <div class="card"><app-loading-block [announce]="false" [lines]="5" /></div>
            <div class="card-highlight hidden xl:block">
              <app-loading-block [announce]="false" [lines]="5" />
            </div>
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
