import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CustomerResponse } from '@saas-o-matic/contract';

import { COUNTRY_NAMES } from '../../shared/format/country-text';
import { DateTimePipe } from '../../shared/format/date-time.pipe';
import { emailBreakSegments } from '../../shared/format/email-segments';
import { PlanBadge } from '../../shared/ui/plan-badge';

/**
 * Customer data (spec 05 §3.3). Values at body size in the normal text colour, labels small and muted (feedback
 * at the visual checkpoint): `.data-list`. The email is always shown whole (AC-84) and wraps only after its «@» and
 * its dots (D-159); only a segment longer than the line, like a 64-character local part at 360 px, is cut inside.
 */
@Component({
  selector: 'app-customer-card',
  imports: [DateTimePipe, PlanBadge],
  template: `
    <section class="card flex h-full flex-col gap-4" aria-labelledby="customer-card-title">
      <h2 id="customer-card-title" class="section-title sm:text-title-lg">Datos del cliente</h2>
      <dl class="data-list">
        <div>
          <dt>Identificador fiscal</dt>
          <dd class="flex flex-wrap items-center gap-2">
            {{ customer().taxId }} <span class="badge badge-neutral">{{ customer().taxIdType }}</span>
          </dd>
        </div>
        <div>
          <dt>País</dt>
          <dd>{{ countryName() }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd class="min-w-0 break-words">
            <!-- On one line: a line break here would become a space inside the address. -->
            <!-- prettier-ignore -->
            <a class="link" [href]="'mailto:' + customer().contactEmail">@for (segment of emailSegments(); track $index) {{{ segment }}<wbr />}</a>
          </dd>
        </div>
        <div>
          <dt>Plan</dt>
          <dd>
            <app-plan-badge [plan]="customer().plan" />
          </dd>
        </div>
        <div>
          <dt>Fecha de alta</dt>
          <dd>{{ customer().createdAt | dateTime: 'date' }}</dd>
        </div>
      </dl>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCard {
  readonly customer = input.required<CustomerResponse>();

  protected readonly countryName = computed(() => COUNTRY_NAMES[this.customer().country]);
  protected readonly emailSegments = computed(() => emailBreakSegments(this.customer().contactEmail));
}
