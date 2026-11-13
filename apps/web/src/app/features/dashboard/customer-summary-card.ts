import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CustomerSummary } from '@saas-o-matic/contract';

import { COUNTRY_NAMES } from '../../shared/format/country-text';
import { DateTimePipe } from '../../shared/format/date-time.pipe';

/**
 * A customer of the listing (spec 05 §3.1): the whole card is one link to its detail, reachable with the keyboard.
 * The company name is its accessible name and the data its description, so a screen reader does not read the whole
 * card as the name of the link. The data flow in one line that wraps, because a card of a three-column grid is too
 * narrow for the label/value columns of `.data-list`; the labels stay for screen readers, and «Alta» is visible.
 */
@Component({
  selector: 'app-customer-summary-card',
  imports: [DateTimePipe, RouterLink],
  template: `
    <a
      [routerLink]="['/customers', customer().id]"
      class="card flex h-full flex-col gap-3 transition-colors hover:border-primary focus-visible:border-primary"
      [attr.aria-labelledby]="nameId()"
      [attr.aria-describedby]="detailsId()"
    >
      <h2 [id]="nameId()" class="section-title wrap-anywhere">{{ customer().companyName }}</h2>
      <dl [id]="detailsId()" class="flex flex-wrap items-center gap-x-4 gap-y-2 text-ink">
        <div class="flex items-center gap-2">
          <dt class="sr-only">Identificador fiscal</dt>
          <dd class="flex items-center gap-2 wrap-anywhere">
            {{ customer().taxId }} <span class="badge whitespace-nowrap">{{ customer().taxIdType }}</span>
          </dd>
        </div>
        <div>
          <dt class="sr-only">País</dt>
          <dd>{{ countryName() }}</dd>
        </div>
        <div>
          <dt class="sr-only">Plan</dt>
          <dd>
            <span class="badge whitespace-nowrap">{{ customer().plan }}</span>
          </dd>
        </div>
        <div class="flex basis-full gap-1 text-small text-ink-muted">
          <dt>Alta:</dt>
          <dd>{{ customer().createdAt | dateTime: 'date' }}</dd>
        </div>
      </dl>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSummaryCard {
  readonly customer = input.required<CustomerSummary>();

  protected readonly countryName = computed(() => COUNTRY_NAMES[this.customer().country]);
  protected readonly nameId = computed(() => `customer-${this.customer().id}-name`);
  protected readonly detailsId = computed(() => `customer-${this.customer().id}-details`);
}
