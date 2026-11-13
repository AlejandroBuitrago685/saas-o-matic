import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { type Currency, CURRENCIES, isCurrency } from '@saas-o-matic/domain';

/**
 * Currency selector of the header (spec 05 §4.1, D-21): a native `<select>`, so the keyboard and screen readers work
 * as usual. A currency without a valid rate is disabled (spec 05 §4.4, CL-31); EUR never is.
 */
@Component({
  selector: 'app-currency-select',
  template: `
    <label class="flex items-center gap-2 text-small font-semibold text-ink">
      Divisa
      <select
        #control
        data-testid="currency-select"
        class="input min-h-11 w-auto py-0 pr-8 pl-3"
        (change)="onChange($event)"
      >
        @for (currency of currencies; track currency) {
          <option [value]="currency" [disabled]="!isAvailable(currency)" [selected]="currency === selected()">
            {{ currency }}
          </option>
        }
      </select>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySelect {
  readonly selected = input.required<Currency>();
  readonly available = input.required<readonly Currency[]>();
  readonly selectedChange = output<Currency>();

  protected readonly currencies = CURRENCIES;
  private readonly availableSet = computed(() => new Set(this.available()));
  private readonly control = viewChild.required<ElementRef<HTMLSelectElement>>('control');

  protected isAvailable(currency: Currency): boolean {
    return this.availableSet().has(currency);
  }

  focus(): void {
    this.control().nativeElement.focus();
  }

  protected onChange(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : undefined;
    if (isCurrency(value)) this.selectedChange.emit(value);
  }
}
