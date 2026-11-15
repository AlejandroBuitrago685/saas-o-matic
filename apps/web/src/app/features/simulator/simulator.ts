import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { CustomerResponse, SimulationResponse } from '@saas-o-matic/contract';
import { tariffForPlan } from '@saas-o-matic/domain';

import type { ReadyCatalog } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/layout/toast.store';
import { Icon } from '../../shared/ui/icon';
import { Spinner } from '../../shared/ui/spinner';
import { ProjectionPanel } from './projection-panel';
import { SimulatorStore } from './simulator.store';
import { TariffSummary } from './tariff-summary';
import { UsersSlider } from './users-slider';

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

/**
 * V4 · Simulador (spec 05 §3.4), mounted inside the customer detail (06-frontend §2): the controls with the tariff they
 * price against, and the total, which holds «Guardar simulación» (D-191).
 */
@Component({
  selector: 'app-simulator',
  imports: [Icon, ProjectionPanel, Spinner, TariffSummary, UsersSlider],
  providers: [SimulatorStore],
  templateUrl: './simulator.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Simulator {
  readonly customer = input.required<CustomerResponse>();
  readonly catalog = input.required<ReadyCatalog>();
  readonly saved = output<SimulationResponse>();

  protected readonly store = inject(SimulatorStore);
  private readonly toasts = inject(ToastStore);
  protected readonly inputValue = inputValue;

  /** Every tier of the customer's tariff, for the box that explains it: the same tariff the store prices with. */
  protected readonly tariffTiers = computed(
    () => tariffForPlan(this.catalog().catalog, this.customer().plan).tiers,
  );

  constructor() {
    this.store.connect(() => ({ customer: this.customer(), catalog: this.catalog() }));
  }

  protected async onSave(): Promise<void> {
    const simulation = await this.store.save();
    if (simulation === undefined) return;
    this.toasts.success('Simulación guardada');
    this.saved.emit(simulation);
  }
}
