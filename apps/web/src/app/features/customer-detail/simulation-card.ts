import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SimulationResponse } from '@saas-o-matic/contract';

import { DateTimePipe } from '../../shared/format/date-time.pipe';
import { IntegerPipe } from '../../shared/format/integer.pipe';
import { MoneyPipe, TaxRatePipe } from '../../shared/format/money.pipe';

/**
 * One saved simulation (spec 05 §3.5): date and time in the browser's zone, the inputs, and the amounts the
 * server stored, with the tax rate **of that day** (`pricing.taxRateBps`), never today's.
 */
@Component({
  selector: 'app-simulation-card',
  imports: [DateTimePipe, IntegerPipe, MoneyPipe, TaxRatePipe],
  template: `
    <article class="card flex flex-col gap-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-small font-normal text-ink-muted">
          <span class="sr-only">Simulación del </span>{{ simulation().createdAt | dateTime }}
        </h3>
        <p class="amount text-title-sm font-extrabold text-ink">
          <span class="sr-only">Total mensual: </span>{{ simulation().pricing.totalCents | money }}
        </p>
      </div>
      <dl class="data-list">
        <div>
          <dt>Usuarios activos</dt>
          <dd class="amount">{{ simulation().activeUsers | integer }}</dd>
        </div>
        <div>
          <dt>Almacenamiento</dt>
          <dd class="amount">{{ simulation().storageGb | integer }} GB</dd>
        </div>
        <div>
          <dt>Llamadas a la API</dt>
          <dd class="amount">{{ simulation().apiCallsPerMonth | integer }} al mes</dd>
        </div>
        <div>
          <dt>Base mensual</dt>
          <dd class="amount">{{ simulation().pricing.baseCents | money }}</dd>
        </div>
        <div>
          <dt>Impuesto ({{ simulation().pricing.taxRateBps | taxRate }})</dt>
          <dd class="amount">{{ simulation().pricing.taxCents | money }}</dd>
        </div>
      </dl>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationCard {
  readonly simulation = input.required<SimulationResponse>();
}
