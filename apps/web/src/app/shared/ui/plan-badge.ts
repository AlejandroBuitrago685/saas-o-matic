import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Plan } from '@saas-o-matic/domain';

/** One tone per plan (D-191), always with its name: the colour helps to scan a list, the text carries the meaning. */
const PLAN_BADGE_CLASS: Readonly<Record<Plan, string>> = {
  STARTER: 'badge badge-neutral',
  BUSINESS: 'badge',
  ENTERPRISE: 'badge badge-info',
};

/** The plan of a customer, as a label: in the listing, in the customer card and wherever a plan is shown. */
@Component({
  selector: 'app-plan-badge',
  template: `<span [class]="badgeClass()">{{ plan() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanBadge {
  readonly plan = input.required<Plan>();

  protected readonly badgeClass = computed(() => PLAN_BADGE_CLASS[this.plan()]);
}
