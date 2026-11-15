import type { Locator } from '@playwright/test';

import { currencyHeader, expectReferenceRates } from '../fixtures/exchange-rates-api.js';
import { expectNoHorizontalScroll, expectTextFullyVisible, NARROW_VIEWPORT } from '../fixtures/layout.js';
import { openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

/** The most users the simulator accepts: in pesos, the longest total of the app («≈ 1.243.127,08 MXN»). */
const MAX_USERS = '10000';

/** The lines the visible text of `locator` takes on screen (the `sr-only` prefix of the history is not drawn). */
function renderedLineCount(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const tops = new Set<number>();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (node.parentElement?.closest('.sr-only') !== null || (node.textContent ?? '').trim() === '')
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) tops.add(Math.round(rect.top));
    }
    return tops.size;
  });
}

for (const viewport of [NARROW_VIEWPORT, { width: 1024, height: 900 }, { width: 1280, height: 900 }]) {
  test.describe(`${String(viewport.width)} px`, () => {
    test.use({ viewport });

    test('AC-84 D-191: the longest total, 10 000 users in pesos, fits on one line in the projection, the history and the average of the dashboard', async ({
      page,
      request,
    }) => {
      const header = currencyHeader(page);
      const simulator = await openSimulator(page, request);
      await expectReferenceRates(header);
      await simulator.usersField.fill(MAX_USERS);
      await header.select.selectOption('MXN');
      await expect(simulator.total).toContainText('MXN');

      await simulator.saveButton.click();
      const savedTotal = page.locator('app-simulation-card p.amount').first();
      await expect(savedTotal).toContainText('MXN');

      for (const total of [simulator.total, savedTotal]) {
        await expectTextFullyVisible(total);
        expect(await renderedLineCount(total)).toBe(1);
      }
      await expectNoHorizontalScroll(page);

      // The average of the dashboard now counts that simulation, converted to pesos too.
      await page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('link', { name: 'Clientes' })
        .click();
      const average = page.locator('app-dashboard-metrics dd').nth(2);
      await expect(average).toContainText('MXN');
      await expectTextFullyVisible(average);
      expect(await renderedLineCount(average)).toBe(1);
      await expectNoHorizontalScroll(page);
    });
  });
}
