import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { SimulationResponse } from '@saas-o-matic/contract';

import { CurrencyStore } from '../../core/currency/currency.store';

import { DateTimePipe } from '../../shared/format/date-time.pipe';
import { IntegerPipe } from '../../shared/format/integer.pipe';
import { MoneyPipe, TaxRatePipe } from '../../shared/format/money.pipe';
import { tierLabel } from '../../shared/format/tier-label';
import { Icon } from '../../shared/ui/icon';
import { TierLabel } from '../../shared/ui/tier-label';

/**
 * One saved simulation (spec 05 §3.5): date and time in the browser's zone, the inputs, and the amounts the
 * server stored, with the tax rate **of that day** (`pricing.taxRateBps`), never today's. The amounts follow the
 * selected currency with the same leaf-item rule as the projection (D-20, AC-87); EUR stays the source of truth.
 * The breakdown by tier folds in a native `<details>` (spec 05 §3.5, Should): keyboard and screen readers get it
 * without code, and the card stays short in a long history. The total leads the card in lavender with «/mes» (D-191),
 * which stays out of the paragraph of the amount: «Total mensual» already says it to screen readers. The inputs go in
 * three columns when the card has room for the longest of them (a container query), and in two otherwise; the base
 * and the tax share a row only when the longest amounts, in pesos, fit side by side.
 */
@Component({
  selector: 'app-simulation-card',
  imports: [DateTimePipe, Icon, IntegerPipe, MoneyPipe, TaxRatePipe, TierLabel],
  template: `
    <article class="card @container flex h-full flex-col gap-4">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <h3 class="text-small font-normal text-ink-muted">
          <span class="sr-only">Simulación del </span>{{ simulation().createdAt | dateTime }}
        </h3>
        <div
          class="flex flex-wrap items-baseline text-title-lg font-extrabold tracking-tight text-primary @min-[24rem]:text-title-xl"
        >
          <p class="amount">
            <span class="sr-only">Total mensual: </span>{{ amounts().total | money: amounts().currency }}
          </p>
          <span aria-hidden="true">/mes</span>
        </div>
      </div>
      <dl class="data-list grid grid-cols-2 gap-x-4 gap-y-3 divide-y-0 @min-[24rem]:grid-cols-3">
        <div class="py-0">
          <dt>Usuarios activos</dt>
          <dd class="amount">{{ simulation().activeUsers | integer }}</dd>
        </div>
        <div class="py-0 @min-[24rem]:border-l @min-[24rem]:border-line @min-[24rem]:pl-4">
          <dt>Almacenamiento</dt>
          <dd>{{ simulation().storageGb | integer }} GB</dd>
        </div>
        <div
          class="col-span-2 py-0 @min-[24rem]:col-span-1 @min-[24rem]:border-l @min-[24rem]:border-line @min-[24rem]:pl-4"
        >
          <dt>Llamadas a la API</dt>
          <dd class="whitespace-nowrap">{{ simulation().apiCallsPerMonth | integer }} al mes</dd>
        </div>
      </dl>
      <dl
        class="data-list grid grid-cols-1 gap-x-4 gap-y-3 divide-y-0 border-t border-line pt-4 @min-[24rem]:grid-cols-2"
      >
        <div class="py-0">
          <dt>Base mensual</dt>
          <dd class="amount">{{ amounts().base | money: amounts().currency }}</dd>
        </div>
        <div class="py-0 @min-[24rem]:border-l @min-[24rem]:border-line @min-[24rem]:pl-4">
          <dt>Impuesto ({{ simulation().pricing.taxRateBps | taxRate }})</dt>
          <dd class="amount">{{ amounts().tax | money: amounts().currency }}</dd>
        </div>
      </dl>
      <details class="group mt-auto border-t border-line pt-3">
        <!-- A flex summary loses the native marker, so it draws its own: it turns when the breakdown opens. -->
        <summary
          class="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-ink [&::-webkit-details-marker]:hidden"
        >
          <app-icon
            name="chevron-right"
            class="size-5 text-primary transition-transform group-open:rotate-90"
          />
          Desglose por tramo
        </summary>
        <dl class="flex flex-col gap-1 pt-2 text-small">
          @for (row of tierRows(); track row.tier) {
            <div class="flex justify-between gap-4">
              <dt><app-tier-label [label]="row.label" /></dt>
              <dd class="amount font-semibold text-ink">{{ row.amount | money: amounts().currency }}</dd>
            </div>
          }
        </dl>
      </details>
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
        tierSubtotals: pricing.tiers.map(({ subtotalCents }) => subtotalCents),
        base: pricing.baseCents,
        tax: pricing.taxCents,
        total: pricing.totalCents,
      }
    );
  });

  /** Each stored tier with its label in EUR (the tariff) and its subtotal in the currency of the card. */
  protected readonly tierRows = computed(() => {
    const { tierSubtotals } = this.amounts();
    return this.simulation().pricing.tiers.map((line, index) => {
      const amount = tierSubtotals[index];
      if (amount === undefined) throw new Error('the converted pricing lost a tier');
      return { tier: line.tier, label: tierLabel(line), amount };
    });
  });
}
