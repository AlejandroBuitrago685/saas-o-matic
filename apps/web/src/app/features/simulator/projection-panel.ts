import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { Country, Pricing, PricingLine } from '@saas-o-matic/domain';

import { CurrencyStore } from '../../core/currency/currency.store';
import { figureSizeClass, PROJECTION_FIGURE_SIZES } from '../../shared/format/figure-size';
import { formatMoney, formatRatesDate, MoneyPipe, TaxRatePipe } from '../../shared/format/money.pipe';
import { tierLabel } from '../../shared/format/tier-label';
import { TierLabel } from '../../shared/ui/tier-label';

/** Screen readers hear the new total at most this often while the slider moves (06-frontend §6). */
export const ANNOUNCE_DELAY_MS = 500;

/** The converted subtotal of each tier, next to its label in EUR. Both lists come from the same pricing. */
function tierRows(
  tiers: readonly PricingLine[],
  subtotals: readonly number[],
): { tier: number; label: string; amount: number }[] {
  return tiers.map((line, index) => {
    const amount = subtotals[index];
    if (amount === undefined) throw new Error('the converted pricing lost a tier');
    return { tier: line.tier, label: tierLabel(line), amount };
  });
}

/**
 * Projection of the simulator, always next to the controls (spec 05 §3.4). It takes the highlighted card of the
 * visual direction (D-122): the total is the figure the sales team quotes. The amounts follow the selected currency
 * with the leaf-item rule (D-20), so the breakdown always adds up; outside EUR they are approximate (D-19). The
 * simulator puts «Guardar simulación» at its foot (D-191), through the content slot.
 */
@Component({
  selector: 'app-projection-panel',
  imports: [MoneyPipe, TaxRatePipe, TierLabel],
  template: `
    <section class="card-highlight @container flex h-full flex-col gap-4" aria-labelledby="projection-title">
      <h2 id="projection-title" class="section-title sm:text-title-lg">Total mensual</h2>
      @if (view(); as current) {
        <p data-testid="projection-total" [class]="totalClass()">
          {{ current.total | money: current.currency }}
        </p>
        <p class="-mt-3 text-small text-ink-soft">Impuestos incluidos · {{ current.currency }}</p>
        <dl class="flex flex-col gap-2 border-t border-line pt-4 text-small text-ink-soft">
          @for (row of current.tiers; track row.tier) {
            <div class="flex justify-between gap-4">
              <dt><app-tier-label [label]="row.label" /></dt>
              <dd class="amount font-semibold text-ink">{{ row.amount | money: current.currency }}</dd>
            </div>
          }
          <div
            class="mt-2 flex justify-between gap-4 border-t border-line pt-4 text-body font-semibold text-ink"
          >
            <dt>Base mensual</dt>
            <dd class="amount">{{ current.base | money: current.currency }}</dd>
          </div>
          <div class="flex justify-between gap-4 text-body">
            <dt>Impuesto ({{ country() }}, {{ current.taxRateBps | taxRate }})</dt>
            <dd class="amount font-semibold text-ink">{{ current.tax | money: current.currency }}</dd>
          </div>
        </dl>
        @if (current.note; as note) {
          <p data-testid="projection-note" class="text-small text-ink-muted">{{ note }}</p>
        }
      } @else {
        <p>No se puede calcular la proyección con estos datos.</p>
      }
      <div class="mt-auto flex flex-col gap-3 pt-2"><ng-content /></div>
      <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionPanel {
  readonly pricing = input.required<Pricing | undefined>();
  readonly country = input.required<Country>();

  private readonly currency = inject(CurrencyStore);
  protected readonly announcement = signal('');

  protected readonly view = computed(() => {
    const pricing = this.pricing();
    const shown = pricing === undefined ? undefined : this.currency.convert(pricing);
    if (pricing === undefined || shown === undefined) return undefined;
    const { currency, tierSubtotals, base, tax, total } = shown.pricing;
    return {
      currency,
      tiers: tierRows(pricing.tiers, tierSubtotals),
      base,
      tax,
      total,
      taxRateBps: pricing.taxRateBps,
      note:
        shown.ratesUpdatedAt === undefined
          ? undefined
          : `Importes orientativos en ${currency} con tipos del ${formatRatesDate(shown.ratesUpdatedAt)}`,
    };
  });

  protected readonly totalClass = computed(() => {
    const view = this.view();
    const text = view === undefined ? '' : formatMoney(view.total, view.currency);
    return `amount font-extrabold tracking-tight text-primary ${figureSizeClass(text, PROJECTION_FIGURE_SIZES)}`;
  });

  private readonly totalText = computed(() => {
    const view = this.view();
    return view === undefined ? '' : `Total mensual: ${formatMoney(view.total, view.currency)}`;
  });

  constructor() {
    // External effect only: a live region announced once the value settles, not on every slider step, and not
    // when the panel appears (the user did nothing yet).
    let initialText: string | undefined;
    let hasChanged = false;
    effect((onCleanup) => {
      const text = this.totalText();
      initialText ??= text;
      hasChanged ||= text !== initialText;
      if (!hasChanged) return;
      const timer = setTimeout(() => {
        this.announcement.set(text);
      }, ANNOUNCE_DELAY_MS);
      onCleanup(() => {
        clearTimeout(timer);
      });
    });
  }
}
