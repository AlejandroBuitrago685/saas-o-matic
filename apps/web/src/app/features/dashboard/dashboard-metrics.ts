import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CurrencyStore } from '../../core/currency/currency.store';
import { figureSizeClass, METRIC_FIGURE_SIZES } from '../../shared/format/figure-size';
import { formatInteger } from '../../shared/format/integer.pipe';
import { formatMoney, formatRatesDate } from '../../shared/format/money.pipe';
import { Icon, type IconName } from '../../shared/ui/icon';
import { DashboardStatsStore } from './dashboard-stats.store';

/** What a metric shows: its figure, or «—» when there is none, and an optional line under it. */
interface Metric {
  readonly label: string;
  readonly icon: IconName;
  readonly value: string;
  readonly hint?: string;
}

/** A metric as the template draws it: with the size classes of its figure. */
type ShownMetric = Metric & { readonly figureClass: string };

const NO_VALUE = '—';

/**
 * The three metrics of the dashboard (spec 05 §3.1, AC-92). The average is a leaf item converted to the selected
 * currency with the rule of every view (D-20), approximate outside EUR (D-19). They never block the listing: while
 * they load, a skeleton that the listing's status already announces; if they fail, «—» and a discreet notice.
 * Each card carries its icon (D-191) inside the term, so the list keeps only terms and definitions. The figure takes
 * the whole width of its card, and its size follows its length and the room of the card (`figure-size.ts`), so it
 * stays on one line at every width.
 */
@Component({
  selector: 'app-dashboard-metrics',
  imports: [Icon],
  template: `
    <section aria-labelledby="metrics-title" class="flex flex-col gap-2">
      <h2 id="metrics-title" class="sr-only">Métricas</h2>
      <dl class="grid grid-cols-1 gap-4 lg:grid-cols-3" [attr.aria-busy]="isLoading() || null">
        @for (metric of metrics(); track metric.label) {
          <!-- One column below 1024 px: the icon on the left, centred. Three columns: the icon beside the label and the
               figure below, across the card, which then has room for it. -->
          <div
            class="card @container relative flex flex-col justify-center gap-1 pl-20 sm:pl-22 lg:gap-2 lg:pl-6"
          >
            <dt class="flex items-center gap-3 text-small font-semibold text-ink-soft">
              <span
                class="icon-tile absolute top-1/2 left-4 size-11 -translate-y-1/2 sm:left-6 lg:static lg:translate-y-0"
                ><app-icon [name]="metric.icon" class="size-6"
              /></span>
              {{ metric.label }}
            </dt>
            <dd
              [class]="
                'font-extrabold tracking-tight whitespace-nowrap text-ink tabular-nums ' + metric.figureClass
              "
            >
              @if (isLoading()) {
                <span class="skeleton block h-8 w-28" aria-hidden="true"></span>
              } @else {
                {{ metric.value }}
                @if (metric.hint; as hint) {
                  <span
                    class="block text-small font-normal tracking-normal whitespace-normal text-ink-muted"
                    >{{ hint }}</span
                  >
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

  protected readonly metrics = computed((): readonly ShownMetric[] =>
    this.values().map((metric) => ({
      ...metric,
      figureClass: figureSizeClass(metric.value, METRIC_FIGURE_SIZES),
    })),
  );

  private readonly values = computed((): readonly Metric[] => {
    const stats = this.stats();
    const average = this.average();
    const hasNoSimulations = stats?.averageBaseCents === null;
    return [
      {
        label: 'Clientes',
        icon: 'users',
        value: stats === undefined ? NO_VALUE : formatInteger(stats.customersCount),
      },
      {
        label: 'Simulaciones',
        icon: 'file-text',
        value: stats === undefined ? NO_VALUE : formatInteger(stats.simulationsCount),
      },
      {
        label: 'Importe medio simulado (sin impuestos)',
        icon: 'coins',
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
