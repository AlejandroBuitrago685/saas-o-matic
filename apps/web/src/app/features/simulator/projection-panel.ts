import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import type { Country, Pricing, PricingLine } from '@saas-o-matic/domain';

import { formatMoney, MoneyPipe, TaxRatePipe } from '../../shared/format/money.pipe';

/** Screen readers hear the new total at most this often while the slider moves (06-frontend §6). */
export const ANNOUNCE_DELAY_MS = 500;

/**
 * «Tramo 2 · usuarios 11–50 · 5 × 8,00 €» (spec 05 §3.4): the tier's range, the users in it and the unit price,
 * always in EUR because it is the price of the tariff. The last tier has no upper limit.
 */
export function tierLabel(line: PricingLine): string {
  const users =
    line.toUser === null
      ? `desde ${String(line.fromUser)}`
      : `${String(line.fromUser)}–${String(line.toUser)}`;
  return `Tramo ${String(line.tier)} · usuarios ${users} · ${String(line.units)} × ${formatMoney(line.unitPriceCents)}`;
}

/**
 * Projection of the simulator, always next to the controls (spec 05 §3.4). It takes the highlighted card of the
 * visual direction (D-122): the total is the figure the sales team quotes.
 */
@Component({
  selector: 'app-projection-panel',
  imports: [MoneyPipe, TaxRatePipe],
  template: `
    <div class="card-highlight flex flex-col gap-3">
      @if (pricing(); as current) {
        <p class="text-small font-semibold text-ink-soft">Total mensual</p>
        <p data-testid="projection-total" class="amount text-display font-extrabold text-primary">
          {{ current.totalCents | money }}
        </p>
        <dl class="flex flex-col gap-1 border-t border-line pt-3 text-small">
          @for (line of current.tiers; track line.tier) {
            <div class="flex justify-between gap-4">
              <dt>{{ tierLabel(line) }}</dt>
              <dd class="amount text-ink">{{ line.subtotalCents | money }}</dd>
            </div>
          }
          <div class="flex justify-between gap-4 font-semibold text-ink">
            <dt>Base mensual</dt>
            <dd class="amount">{{ current.baseCents | money }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt>Impuesto ({{ country() }}, {{ current.taxRateBps | taxRate }})</dt>
            <dd class="amount text-ink">{{ current.taxCents | money }}</dd>
          </div>
        </dl>
      } @else {
        <p>No se puede calcular la proyección con estos datos.</p>
      }
      <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionPanel {
  readonly pricing = input.required<Pricing | undefined>();
  readonly country = input.required<Country>();

  protected readonly tierLabel = tierLabel;
  protected readonly announcement = signal('');
  private readonly totalText = computed(() => {
    const pricing = this.pricing();
    return pricing === undefined ? '' : `Total mensual: ${formatMoney(pricing.totalCents)}`;
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
