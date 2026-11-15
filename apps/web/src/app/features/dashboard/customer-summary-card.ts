import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CustomerSummary } from '@saas-o-matic/contract';

import { COUNTRY_NAMES } from '../../shared/format/country-text';
import { DateTimePipe } from '../../shared/format/date-time.pipe';
import { Icon } from '../../shared/ui/icon';
import { PlanBadge } from '../../shared/ui/plan-badge';

/**
 * A customer of the listing (spec 05 §3.1): the whole card opens its detail, and the keyboard reaches it once. The link
 * is the company name, and `.card-link` stretches it over the card. So its accessible name is the text it shows (WCAG
 * 2.5.3, axe `label-content-name-mismatch`, D-157), and the data are its description, now with their labels in view
 * (D-191). The plan stays in the list, so the description still names it, but it is drawn first: under the name on a
 * phone, in the top corner from 640 px, where the title keeps room for it. Only the visual order changes; nothing in
 * the card takes the focus. «Ver detalle» only says that the card opens: it is not a second link, so screen readers
 * skip it.
 */
@Component({
  selector: 'app-customer-summary-card',
  imports: [DateTimePipe, Icon, PlanBadge, RouterLink],
  template: `
    <div
      class="tile group relative flex h-full flex-col gap-3 transition-colors hover:border-primary hover:bg-primary-tint has-[.card-link:focus-visible]:border-primary has-[.card-link:focus-visible]:bg-primary-tint"
    >
      <h2 class="section-title wrap-anywhere sm:pr-32">
        <a
          [routerLink]="['/customers', customer().id]"
          class="card-link decoration-2 underline-offset-4 group-hover:text-primary group-hover:underline"
          [attr.aria-describedby]="detailsId()"
          >{{ customer().companyName }}</a
        >
      </h2>
      <dl [id]="detailsId()" class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
        <div class="min-w-0">
          <dt class="data-label">Identificador fiscal</dt>
          <dd class="data-value flex flex-wrap items-center gap-x-2 gap-y-1 wrap-anywhere">
            {{ customer().taxId }} <span class="badge badge-neutral">{{ customer().taxIdType }}</span>
          </dd>
        </div>
        <div class="min-w-0 border-l border-line pl-4">
          <dt class="data-label">País</dt>
          <dd class="data-value">{{ countryName() }}</dd>
        </div>
        <div class="pointer-events-none order-first col-span-2 sm:absolute sm:top-5 sm:right-5 sm:order-none">
          <dt class="sr-only">Plan</dt>
          <dd><app-plan-badge [plan]="customer().plan" /></dd>
        </div>
        <div>
          <dt class="data-label">Fecha de alta</dt>
          <dd class="data-value">{{ customer().createdAt | dateTime: 'date' }}</dd>
        </div>
      </dl>
      <p class="mt-auto flex items-center gap-1.5 font-bold text-primary" aria-hidden="true">
        Ver detalle
        <app-icon name="arrow-right" class="size-4 transition-transform group-hover:translate-x-1" />
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSummaryCard {
  readonly customer = input.required<CustomerSummary>();

  protected readonly countryName = computed(() => COUNTRY_NAMES[this.customer().country]);
  protected readonly detailsId = computed(() => `customer-${this.customer().id}-details`);
}
