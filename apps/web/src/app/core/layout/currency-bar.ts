import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { Currency } from '@saas-o-matic/domain';

import { CurrencyStore } from '../currency/currency.store';
import { ExchangeRatesStore } from '../currency/exchange-rates.store';
import { CurrencySelect } from './currency-select';
import { RatesStatus } from './rates-status';

/**
 * The currency part of the header (spec 05 §4.1 and §4.4): the rates indicator next to the selector, both always
 * visible. «Reintentar» disappears as soon as it is pressed, so the focus moves to the selector first instead of
 * falling back to the start of the page.
 */
@Component({
  selector: 'app-currency-bar',
  imports: [CurrencySelect, RatesStatus],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:justify-end">
      <app-rates-status [state]="rates.state()" [chosen]="currency.chosen()" (retry)="retry()" />
      <app-currency-select
        [selected]="currency.effective()"
        [available]="currency.available()"
        (selectedChange)="select($event)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyBar {
  protected readonly rates = inject(ExchangeRatesStore);
  protected readonly currency = inject(CurrencyStore);
  private readonly selector = viewChild.required(CurrencySelect);

  protected select(currency: Currency): void {
    this.currency.select(currency);
  }

  protected retry(): void {
    this.selector().focus();
    void this.rates.retry();
  }
}
