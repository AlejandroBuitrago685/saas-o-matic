import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TariffTierInput } from '@saas-o-matic/domain';

import { tariffTierText } from '../../shared/format/tariff-tier-text';

/**
 * How the price is built (D-191): every tier of the customer's tariff, from the catalog, with users at 0 or not. The
 * projection beside it lists only the tiers with users (spec 05 §3.4); this box explains the tariff they come from.
 * In a narrow box the price goes under its users instead of leaving a «·» at the end of a line.
 */
@Component({
  selector: 'app-tariff-summary',
  template: `
    <section
      aria-labelledby="tariff-title"
      class="@container flex flex-col gap-2 rounded-md bg-primary-tint p-4 sm:p-5"
    >
      <h3 id="tariff-title" class="text-body font-extrabold text-ink">Tarificación acumulativa</h3>
      <ul class="flex flex-col gap-1 text-small text-ink-soft">
        @for (row of rows(); track $index) {
          <li>
            <span class="font-semibold text-ink">{{ row.users }}</span><span
              class="sr-only @min-[19rem]:not-sr-only"
              >{{ separator }}</span
            ><span class="amount block @min-[19rem]:inline">{{ row.price }}</span>
          </li>
        }
      </ul>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TariffSummary {
  readonly tiers = input.required<readonly TariffTierInput[]>();

  protected readonly separator = ' · ';
  protected readonly rows = computed(() => this.tiers().map(tariffTierText));
}
