import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CurrencyStore } from '../../core/currency/currency.store';
import { formatInteger } from '../../shared/format/integer.pipe';
import { formatMoney, formatRatesDate } from '../../shared/format/money.pipe';
import { DashboardStatsStore } from './dashboard-stats.store';

/** What a metric shows: its figure, or «—» when there is none, and an optional line under it. */
interface Metric {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

const NO_VALUE = '—';

/**
 * The three metrics of the dashboard (spec 05 §3.1, AC-92). The average is a leaf item converted to the selected
 * currency with the rule of every view (D-20), approximate outside EUR (D-19). They never block the listing: while
 * they load, a skeleton that the listing's status already announces; if they fail, «—» and a discreet notice.
 */
@Component({
  selector: 'app-dashboard-metrics',
  template: `
    <section aria-labelledby="metrics-title" class="flex flex-col gap-2">
      <h2 id="metrics-title" class="sr-only">Métricas</h2>
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3" [attr.aria-busy]="isLoading() || null">
        @for (metric of metrics(); track metric.label) {
          <div class="card flex flex-col gap-1">
            <dt class="text-small text-ink-muted">{{ metric.label }}</dt>
            <dd class="amount text-title-sm font-extrabold text-ink">
              @if (isLoading()) {
                <span class="skeleton block h-7 w-24" aria-hidden="true"></span>
              } @else {
                {{ metric.value }}
                @if (metric.hint; as hint) {
                  <span class="block text-small font-normal text-ink-muted">{{ hint }}</span>
                }
              }
            </dd>
          </div>
        }
      </dl>
      @if (note(); as text) {
        <p data-testid="metrics-note" class="text-small text-ink-muted">{{ text }}</p>
      }
      @if (hasFailed()) {
        <p data-testid="metrics-error" class="text-small text-ink-muted">
          No se han podido cargar las métricas.
        </p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetrics {
  private readonly store = inject(DashboardStatsStore);
  private readonly currency = inject(CurrencyStore);

  protected readonly isLoading = computed(() => this.store.state().status === 'loading');
  protected readonly hasFailed = computed(() => this.store.state().status === 'error');

  private readonly stats = computed(() => {
    const state = this.store.state();
    return state.status === 'ready' ? state.stats : undefined;
  });

  private readonly average = computed(() => {
    const cents = this.stats()?.averageBaseCents;
    return cents === undefined || cents === null ? undefined : this.currency.convertAmount(cents);
  });

  protected readonly metrics = computed((): readonly Metric[] => {
    const stats = this.stats();
    const average = this.average();
    const hasNoSimulations = stats?.averageBaseCents === null;
    return [
      { label: 'Clientes', value: stats === undefined ? NO_VALUE : formatInteger(stats.customersCount) },
      {
        label: 'Simulaciones',
        value: stats === undefined ? NO_VALUE : formatInteger(stats.simulationsCount),
      },
      {
        label: 'Importe medio simulado (sin impuestos)',
        value: average === undefined ? NO_VALUE : formatMoney(average.amount, average.currency),
        ...(hasNoSimulations ? { hint: 'Aún no hay simulaciones' } : {}),
      },
    ];
  });

  protected readonly note = computed(() => {
    const average = this.average();
    return average?.ratesUpdatedAt === undefined
      ? undefined
      : `Orientativo en ${average.currency} con tipos del ${formatRatesDate(average.ratesUpdatedAt)}`;
  });
}
