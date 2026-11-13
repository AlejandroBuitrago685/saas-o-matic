import { type APIRequestContext, expect, type Locator, type Page } from '@playwright/test';
import type { CustomerResponse } from '@saas-o-matic/contract';

import { createCustomer } from './customers.js';

/** The simulator of the detail page (spec 05 §3.4) and the locators its tests share. */
export interface Simulator {
  readonly customer: CustomerResponse;
  readonly slider: Locator;
  readonly usersField: Locator;
  readonly total: Locator;
  readonly saveButton: Locator;
  /** The amount of a line of the projection, found by its label. */
  readonly projectionLine: (label: string | RegExp) => Locator;
}

/** The users the simulator opens with, the example of the statement (D-160): where every slider test starts. */
const INITIAL_USERS = 15;

/**
 * A new Spanish customer, with its detail page open and the simulator ready: the slider announces the initial users.
 * Visible is not enough to rely on its value (D-160 made a stale read wrong, see the AC-91 test).
 */
export async function openSimulator(page: Page, request: APIRequestContext): Promise<Simulator> {
  const customer = await createCustomer(request);
  await page.goto(`/customers/${customer.id}`);
  const total = page.getByTestId('projection-total');
  const panel = total.locator('xpath=..');
  const simulator: Simulator = {
    customer,
    slider: page.getByRole('slider', { name: 'Usuarios activos' }),
    usersField: page.getByRole('textbox', { name: 'Usuarios activos' }),
    total,
    saveButton: page.getByRole('button', { name: 'Guardar simulación' }),
    projectionLine: (label) => panel.locator('dl > div').filter({ hasText: label }).locator('dd'),
  };
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', `${String(INITIAL_USERS)} usuarios`);
  return simulator;
}

/** The number of users the slider announces: «1.100 usuarios» → 1100. */
export async function announcedUsers(slider: Locator): Promise<number> {
  const text = (await slider.getAttribute('aria-valuetext')) ?? '';
  return Number(text.replace(/\D/g, ''));
}
