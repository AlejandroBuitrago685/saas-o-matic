import type { Locator, Page } from '@playwright/test';

import { euros } from '../fixtures/amounts.js';
import { announcedUsers, openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

/** Presses → on the focused slider until it announces `target` users; fails if a step jumps over it (AC-91). */
async function stepTo(page: Page, slider: Locator, target: number): Promise<void> {
  let users = await announcedUsers(slider);
  while (users < target) {
    const previous = await slider.getAttribute('aria-valuetext');
    await page.keyboard.press('ArrowRight');
    await expect(slider).not.toHaveAttribute('aria-valuetext', previous ?? '');
    users = await announcedUsers(slider);
  }
  expect(users, `the slider jumped over ${String(target)}`).toBe(target);
}

/**
 * Runs in the page (AC-90): from the next key press on the slider to the frame after the total changes, measured with
 * the clock of the page, so the time of the test runner is not counted.
 */
function installLatencyProbe(): void {
  const found = document.querySelector('[data-testid="projection-total"]');
  if (!(found instanceof HTMLElement)) throw new Error('the projection is not rendered');
  // A declaration keeps the narrowed type inside the nested function declarations below.
  const total: HTMLElement = found;
  const before = total.textContent;
  let resolveLatency: (ms: number) => void = () => undefined;
  const latency = new Promise<number>((resolve) => {
    resolveLatency = resolve;
  });
  function onKeydown(event: KeyboardEvent): void {
    const observer = new MutationObserver(onMutation);
    function onMutation(): void {
      if (total.textContent === before) return;
      observer.disconnect();
      requestAnimationFrame(() => {
        resolveLatency(performance.now() - event.timeStamp);
      });
    }
    observer.observe(total, { characterData: true, childList: true, subtree: true });
  }
  document.addEventListener('keydown', onKeydown, { once: true, capture: true });
  window.__latency = latency;
}

test('D-160 TV-PR-04: the simulator opens at 15 users, the example of the statement (100 € + 40 € = 140 €)', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);

  await expect(simulator.usersField).toHaveValue('15');
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '15 usuarios');
  await expect(simulator.projectionLine('Base mensual')).toHaveText(euros('140,00'));
  await expect(simulator.total).toHaveText(euros('169,40'));
});

test('AC-76 TV-PR-04: 15 users in Spain project the tiers, the 21 % tax and 169,40 €', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);

  await simulator.usersField.fill('15');

  await expect(simulator.projectionLine(/^Tramo 1 · usuarios 1–10 · 10 × 10,00\s€/)).toHaveText(
    euros('100,00'),
  );
  await expect(simulator.projectionLine(/^Tramo 2 · usuarios 11–50 · 5 × 8,00\s€/)).toHaveText(
    euros('40,00'),
  );
  await expect(simulator.projectionLine('Base mensual')).toHaveText(euros('140,00'));
  await expect(simulator.projectionLine(/^Impuesto \(ES, 21\s%\)/)).toHaveText(euros('29,40'));
  await expect(simulator.total).toHaveText(euros('169,40'));
});

test('AC-77 TV-SL-07: the slider and the field follow each other; out of range keeps the last projection', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);

  await simulator.slider.fill('100');
  await expect(simulator.usersField).toHaveValue('110');

  await simulator.usersField.fill('37');
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '37 usuarios');
  await expect(simulator.slider).toHaveValue('36');
  const lastValidTotal = await simulator.total.textContent();

  for (const outOfRange of ['10001', '0']) {
    await simulator.usersField.fill(outOfRange);
    await expect(page.locator('#users-error')).toBeVisible();
    await expect(simulator.total).toHaveText(lastValidTotal ?? '');
    await expect(simulator.saveButton).toBeDisabled();
  }
});

test('AC-91 TV-SL-02 TV-SL-03 TV-SL-04 TV-SL-05: the keyboard reaches 10, 11, 50 and 51 and announces them', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);
  await simulator.slider.focus();
  await page.keyboard.press('Home');
  // Without Zone.js the slider repaints after the key, not during it: reading at once could still see the 15 it opens
  // with (D-160), skip every step and fail with «jumped over 10». Only the 1 of Home is a safe start.
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '1 usuarios');

  await stepTo(page, simulator.slider, 10);
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '10 usuarios');
  await expect(simulator.projectionLine(/^Tramo 2/)).toHaveCount(0);
  await stepTo(page, simulator.slider, 11);
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '11 usuarios');
  await expect(simulator.projectionLine(/^Tramo 2/)).toHaveCount(1);
  await stepTo(page, simulator.slider, 50);
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '50 usuarios');
  await expect(simulator.projectionLine(/^Tramo 3/)).toHaveCount(0);
  await stepTo(page, simulator.slider, 51);
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '51 usuarios');
  await expect(simulator.projectionLine(/^Tramo 3/)).toHaveCount(1);

  await simulator.usersField.fill('105');
  await expect(simulator.slider).toHaveAttribute('aria-valuetext', '105 usuarios');
});

test('AC-90: the total follows a change of users in less than 100 ms', async ({ page, request }) => {
  const simulator = await openSimulator(page, request);
  await simulator.slider.focus();
  await page.evaluate(installLatencyProbe);

  await page.keyboard.press('ArrowRight');
  // NaN when the probe was not installed: the assertion below fails on it.
  const latencyMs = (await page.evaluate(async () => window.__latency)) ?? Number.NaN;

  test.info().annotations.push({ type: 'AC-90 latency', description: `${latencyMs.toFixed(1)} ms` });
  expect(latencyMs).toBeLessThan(100);
});
