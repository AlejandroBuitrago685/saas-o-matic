import { computed, inject, Injectable, signal, type Signal } from '@angular/core';
import type { CustomerResponse, SimulationResponse } from '@saas-o-matic/contract';
import {
  calculatePricing,
  type Pricing,
  positionToUsers,
  tariffForPlan,
  taxRateFor,
  usersToPosition,
} from '@saas-o-matic/domain';

import type { ReadyCatalog } from '../../core/catalog/catalog.store';
import { fieldMessage } from '../../core/errors/error-messages';
import { type IntegerRange, parseIntegerField } from './integer-field';
import { saveFailureMessage } from './save-failure';
import { SimulatorApi } from './simulator.api';

export interface SimulatorContext {
  readonly customer: Pick<CustomerResponse, 'id' | 'country' | 'plan'>;
  readonly catalog: ReadyCatalog;
}

function fieldError(text: string, range: IntegerRange): string | null {
  const parsed = parseIntegerField(text, range);
  return parsed.ok ? null : fieldMessage(parsed.error, range);
}

/**
 * State of the simulator (06-frontend §3 and §6), one per simulator component. The projection is a `computed` over
 * the same domain function the API runs when saving (ADR-008): moving the slider never calls the network (RNF-09).
 */
@Injectable()
export class SimulatorStore {
  private readonly api = inject(SimulatorApi);
  private source: (() => SimulatorContext) | undefined;

  /** Raw text of each field: an invalid value stays visible with its error, never corrected silently. */
  readonly usersText = signal('1');
  readonly storageText = signal('0');
  readonly apiCallsText = signal('0');
  /** Last valid number of users: what the projection and the slider show. */
  private readonly lastValidUsers = signal(1);
  readonly users: Signal<number> = this.lastValidUsers.asReadonly();

  private readonly isSaving = signal(false);
  readonly saving: Signal<boolean> = this.isSaving.asReadonly();
  private readonly saveFailure = signal<string | null>(null);
  readonly saveError: Signal<string | null> = this.saveFailure.asReadonly();

  private readonly context = computed(() => {
    if (this.source === undefined) throw new Error('SimulatorStore.connect() was not called');
    return this.source();
  });
  private readonly limits = computed(() => this.context().catalog.response.limits);

  readonly usersError = computed(() => fieldError(this.usersText(), this.limits().activeUsers));
  readonly storageError = computed(() => fieldError(this.storageText(), this.limits().storageGb));
  readonly apiCallsError = computed(() => fieldError(this.apiCallsText(), this.limits().apiCallsPerMonth));

  readonly sliderPosition = computed(() => {
    const position = usersToPosition(this.users());
    return position.ok ? position.value : 0;
  });

  /** Projection in EUR, recomputed on every change (spec 05 §3.4, AC-76). */
  readonly pricing: Signal<Pricing | undefined> = computed(() => {
    const { customer, catalog } = this.context();
    const tariff = tariffForPlan(catalog.catalog, customer.plan);
    const pricing = calculatePricing(tariff, this.users(), taxRateFor(catalog.catalog, customer.country));
    return pricing.ok ? pricing.value : undefined;
  });

  readonly canSave = computed(
    () =>
      !this.isSaving() &&
      [this.usersError(), this.storageError(), this.apiCallsError()].every((e) => e === null),
  );

  /** The component passes its inputs once, in its constructor: they are read lazily, so they stay reactive. */
  connect(source: () => SimulatorContext): void {
    this.source = source;
  }

  setUsersText(text: string): void {
    this.usersText.set(text);
    const parsed = parseIntegerField(text, this.limits().activeUsers);
    if (parsed.ok) this.lastValidUsers.set(parsed.value);
  }

  setSliderPosition(position: number): void {
    const users = positionToUsers(position);
    if (!users.ok) return;
    this.lastValidUsers.set(users.value);
    this.usersText.set(String(users.value));
  }

  /** Saves once even on a double click (AC-89): the button and this guard both wait for the answer. */
  async save(): Promise<SimulationResponse | undefined> {
    if (!this.canSave()) return undefined;
    this.isSaving.set(true);
    this.saveFailure.set(null);
    try {
      return await this.api.create({
        customerId: this.context().customer.id,
        activeUsers: this.users(),
        storageGb: Number(this.storageText().trim()),
        apiCallsPerMonth: Number(this.apiCallsText().trim()),
      });
    } catch (error: unknown) {
      this.saveFailure.set(saveFailureMessage(error));
      return undefined;
    } finally {
      this.isSaving.set(false);
    }
  }
}
