import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CustomerSummary } from '@saas-o-matic/contract';

import { COUNTRY_NAMES } from '../../shared/format/country-text';
import { DateTimePipe } from '../../shared/format/date-time.pipe';

/**
 * A customer of the listing (spec 05 §3.1): the whole card opens its detail, and the keyboard reaches it once. The link
 * is the company name, and `.card-link` stretches it over the card. So its accessible name is the text it shows (WCAG
 * 2.5.3, axe `label-content-name-mismatch`, D-157), and the data are its description. The data flow in one line that
 * wraps, because a card of a three-column grid is too narrow for the label/value columns of `.data-list`; the labels
 * stay for screen readers, and «Alta» is visible.
 */
@Component({
  selector: 'app-customer-summary-card',
  imports: [DateTimePipe, RouterLink],
  template: `
    <div
      class="card relative flex h-full flex-col gap-3 transition-colors hover:border-primary has-[.card-link:focus-visible]:border-primary"
    >
      <h2 class="section-title wrap-anywhere">
        <a
          [routerLink]="['/customers', customer().id]"
          class="card-link"
          [attr.aria-describedby]="detailsId()"
          >{{ customer().companyName }}</a
        >
      </h2>
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSummaryCard {
  readonly customer = input.required<CustomerSummary>();

  protected readonly countryName = computed(() => COUNTRY_NAMES[this.customer().country]);
  protected readonly detailsId = computed(() => `customer-${this.customer().id}-details`);
}
