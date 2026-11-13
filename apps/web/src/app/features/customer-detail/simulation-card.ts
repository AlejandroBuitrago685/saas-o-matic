import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { SimulationResponse } from '@saas-o-matic/contract';

import { CurrencyStore } from '../../core/currency/currency.store';

import { DateTimePipe } from '../../shared/format/date-time.pipe';
import { IntegerPipe } from '../../shared/format/integer.pipe';
import { MoneyPipe, TaxRatePipe } from '../../shared/format/money.pipe';

/**
 * One saved simulation (spec 05 §3.5): date and time in the browser's zone, the inputs, and the amounts the
 * server stored, with the tax rate **of that day** (`pricing.taxRateBps`), never today's. The amounts follow the
 * selected currency with the same leaf-item rule as the projection (D-20, AC-87); EUR stays the source of truth.
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
          <span class="sr-only">Total mensual: </span>{{ amounts().total | money: amounts().currency }}
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
          <dd class="amount">{{ amounts().base | money: amounts().currency }}</dd>
        </div>
        <div>
          <dt>Impuesto ({{ simulation().pricing.taxRateBps | taxRate }})</dt>
          <dd class="amount">{{ amounts().tax | money: amounts().currency }}</dd>
        </div>
      </dl>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationCard {
  readonly simulation = input.required<SimulationResponse>();

  private readonly currency = inject(CurrencyStore);

  /**
   * In EUR, the snapshot the server stored, as it is (EUR is the source of truth, D-19); in another currency, its
   * leaf items converted. The stored amounts also stand in if a conversion ever left the safe range (D-91).
   */
  protected readonly amounts = computed(() => {
    const { pricing } = this.simulation();
    const shown = this.currency.effective() === 'EUR' ? undefined : this.currency.convert(pricing);
    return (
      shown?.pricing ?? {
        currency: 'EUR' as const,
        base: pricing.baseCents,
        tax: pricing.taxCents,
        total: pricing.totalCents,
      }
    );
  });
}
