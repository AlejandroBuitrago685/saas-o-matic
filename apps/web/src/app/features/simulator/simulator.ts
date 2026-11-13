import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { CustomerResponse, SimulationResponse } from '@saas-o-matic/contract';

import type { ReadyCatalog } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/layout/toast.store';
import { Spinner } from '../../shared/ui/spinner';
import { ProjectionPanel } from './projection-panel';
import { SimulatorStore } from './simulator.store';
import { UsersSlider } from './users-slider';

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

/** V4 · Simulador (spec 05 §3.4), mounted inside the customer detail (06-frontend §2). */
@Component({
  selector: 'app-simulator',
  imports: [ProjectionPanel, Spinner, UsersSlider],
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
