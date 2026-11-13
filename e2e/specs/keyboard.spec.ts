import type { ElementHandle, Page } from '@playwright/test';

import { announcedUsers, openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

/** What the focused element is, as a screen reader names it, and whether its focus can be seen. */
interface FocusStop {
  readonly snapshot: string;
  readonly isRingVisible: boolean;
}

interface FocusedElement {
  readonly handle: ElementHandle<Element>;
  readonly snapshot: string;
  readonly focusedRing: string;
}

/** Outline and shadow of the element and of its ::after (the dashboard cards draw their ring round the card, D-157). */
function ringOf(handle: ElementHandle<Element>): Promise<string> {
  return handle.evaluate((element) => {
    const ring = ({ outlineStyle, outlineWidth, outlineColor, boxShadow }: CSSStyleDeclaration): string =>
      `${outlineStyle} ${outlineWidth} ${outlineColor} | ${boxShadow}`;
    return `${ring(getComputedStyle(element))} || ${ring(getComputedStyle(element, '::after'))}`;
  });
}

async function focusedElement(page: Page): Promise<FocusedElement | null> {
  const handle = (await page.evaluateHandle(() => document.activeElement)).asElement();
  const isPage = handle === null || (await handle.evaluate((element) => element === document.body));
  if (handle === null || isPage) return null;
  const snapshot = (await page.locator(':focus').ariaSnapshot()).split('\n')[0] ?? '';
  return { handle, snapshot, focusedRing: await ringOf(handle) };
}

/**
 * A focus is visible if the element looks different with it and without it: a shadow it always has does not count
 * (P9 review). Compared once the focus has left every element.
 */
async function toStops(page: Page, focused: readonly FocusedElement[]): Promise<FocusStop[]> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  return Promise.all(
    focused.map(async ({ handle, snapshot, focusedRing }) => ({
      snapshot,
      isRingVisible: (await ringOf(handle)) !== focusedRing,
    })),
  );
}

/** Presses Tab from the top of the page until the focus leaves it or comes back to the first element. */
async function tabThroughPage(page: Page): Promise<FocusStop[]> {
  const focused: FocusedElement[] = [];
  for (let presses = 0; presses < 40; presses += 1) {
    await page.keyboard.press('Tab');
    const current = await focusedElement(page);
    const first = focused[0]?.handle;
    const isBackToFirst =
      current !== null &&
      first !== undefined &&
      (await page.evaluate(([a, b]) => a === b, [first, current.handle]));
    if (current === null || isBackToFirst) break;
    focused.push(current);
  }
  return toStops(page, focused);
}

test('AC-86: Re Pág, Av Pág, Fin and Inicio move the slider as spec 05 §3.4.1 says', async ({
  page,
  request,
}) => {
  const { slider } = await openSimulator(page, request);
  await slider.focus();

  // The value is announced after Angular updates the view: it is waited for, never read once (regression of P9).
  const pressAndExpect = async (key: string, users: number): Promise<void> => {
    await page.keyboard.press(key);
    await expect.poll(() => announcedUsers(slider), { message: `after ${key}` }).toBe(users);
  };

  // Ten positions per page: 0 → 10 → 20 are 11 and 21 users; the ends are 1 and 10 000. At an end, nothing moves.
  await pressAndExpect('PageUp', 11);
  await pressAndExpect('PageUp', 21);
  await pressAndExpect('PageDown', 11);
  await pressAndExpect('End', 10_000);
  await pressAndExpect('PageUp', 10_000);
  await pressAndExpect('Home', 1);
  await pressAndExpect('PageDown', 1);
});

test('AC-86: the create page is crossed with Tab, every control has a name and its focus is visible', async ({
  page,
}) => {
  await page.goto('/customers/new');
  await expect(page.getByRole('button', { name: 'Crear cliente' })).toBeVisible();

  const stops = await tabThroughPage(page);

  const unnamed = stops.filter(({ snapshot }) => !/"[^"]+"/.test(snapshot)).map(({ snapshot }) => snapshot);
  const withoutRing = stops.filter(({ isRingVisible }) => !isRingVisible).map(({ snapshot }) => snapshot);
  expect(unnamed, 'controls without an accessible name').toEqual([]);
  expect(withoutRing, 'controls whose focus cannot be seen').toEqual([]);
  const formStops = stops
    .map(({ snapshot }) => snapshot)
    .filter((snapshot) => /País|Nombre de empresa|Email de contacto|Plan|Crear cliente/.test(snapshot));
  expect(formStops).toEqual([
    expect.stringContaining('"País"'),
    expect.stringContaining('"Nombre de empresa"'),
    expect.stringContaining('"Email de contacto"'),
    expect.stringContaining('"Plan"'),
    expect.stringContaining('"Crear cliente"'),
  ]);
});

test('AC-86: a card of the dashboard shows its focus round the card and opens with Intro', async ({
  page,
  request,
}) => {
  await openSimulator(page, request);
  await page.goto('/');
  const card = page.getByRole('list', { name: 'Clientes' }).getByRole('link').first();
  await expect(card).toBeVisible();

  await card.focus();
  const focused = await focusedElement(page);
  const [stop] = await toStops(page, focused === null ? [] : [focused]);
  await card.focus();
  await page.keyboard.press('Enter');

  expect(stop?.isRingVisible).toBe(true);
  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
});
