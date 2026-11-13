import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Currency } from '@saas-o-matic/domain';

import { formatRatesDate } from '../../shared/format/money.pipe';
import { Spinner } from '../../shared/ui/spinner';
import type { RatesState } from '../currency/rates-state';

export type RatesStatusTone = 'neutral' | 'warning' | 'danger';

/** What the indicator shows in each state (spec 05 §4.4). */
export interface RatesStatusView {
  readonly text: string;
  /** «Actualizando…» while expired rates are refreshed. */
  readonly detail: string | undefined;
  readonly isBusy: boolean;
  readonly canRetry: boolean;
  readonly tone: RatesStatusTone;
}

/**
 * The texts of spec 05 §4.4. The error says «importes en EUR» when the user had chosen another currency, because the
 * amounts fell back to EUR (D-143).
 */
export function ratesStatusView(state: RatesState, chosen: Currency): RatesStatusView {
  const quiet = { detail: undefined, isBusy: false, canRetry: false, tone: 'neutral' } as const;
  switch (state.status) {
    case 'loading':
      return { ...quiet, text: 'Cargando tipos de cambio…', isBusy: true };
    case 'fresh':
      return { ...quiet, text: `Tipos del ${formatRatesDate(state.snapshot.rates.updatedAt)}` };
    case 'refreshing':
      return {
        ...quiet,
        text: `Tipos del ${formatRatesDate(state.snapshot.rates.updatedAt)}`,
        detail: 'Actualizando…',
        isBusy: true,
      };
    case 'stale':
      return {
        ...quiet,
        text: `Tipos desactualizados del ${formatRatesDate(state.snapshot.rates.updatedAt)}`,
        canRetry: true,
        tone: 'warning',
      };
    case 'error':
      return {
        ...quiet,
        text: `No se han podido obtener los tipos de cambio${chosen === 'EUR' ? '' : '; importes en EUR'}`,
        canRetry: true,
        tone: 'danger',
      };
  }
}

const TONE_CLASS: Readonly<Record<RatesStatusTone, string>> = {
  neutral: 'text-ink-soft',
  warning: 'font-semibold text-warning-fg',
  danger: 'font-semibold text-danger-fg',
};

/**
 * Fixed indicator of the exchange-rate API (spec 05 §4.4, D-51): always visible, whatever the currency, and never a
 * notification that goes away. The text is a polite live region, so each change is announced without interrupting;
 * «Reintentar» stays outside it. A warning or an error carries an icon as well as its colour (WCAG 1.4.1).
 */
@Component({
  selector: 'app-rates-status',
  imports: [Spinner],
  template: `
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
      <p data-testid="rates-status" role="status" aria-live="polite" [class]="toneClass()">
        @if (view().isBusy) {
          <app-spinner />
        } @else if (view().tone !== 'neutral') {
          <svg aria-hidden="true" viewBox="0 0 20 20" class="size-5 shrink-0 fill-current">
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m-1 4h2v5H9zm0 6h2v2H9z" />
          </svg>
        }
        <span>{{ view().text }}</span>
        @if (view().detail; as detail) {
          <span class="text-ink-muted">{{ detail }}</span>
        }
      </p>
      @if (view().canRetry) {
        <button type="button" class="btn btn-secondary min-h-11 px-3 text-small" (click)="retry.emit()">
          Reintentar
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatesStatus {
  readonly state = input.required<RatesState>();
  readonly chosen = input.required<Currency>();
  readonly retry = output();

  protected readonly view = computed(() => ratesStatusView(this.state(), this.chosen()));
  protected readonly toneClass = computed(() => `flex items-center gap-2 ${TONE_CLASS[this.view().tone]}`);
}
