import { expectNoHorizontalScroll, expectTextFullyVisible, NARROW_VIEWPORT } from '../fixtures/layout.js';
import { expect, test } from '../fixtures/test.js';

/**
 * The guards of every e2e test work (AC-64, D-70, RT-05): a CSP violation and a request to an external origin are
 * recorded, which makes the test fail at teardown. Each test here clears what it provoked on purpose.
 */
test.describe('AC-64 guards of every e2e test', () => {
  test(
    'AC-64: an inline script blocked by the real CSP is recorded as a violation',
    { tag: '@prod-only' },
    async ({ page, guards }) => {
      await page.goto('/customers/new');

      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.name = "inline";';
        document.body.append(script);
      });

      await expect.poll(() => guards.cspViolations.length).toBeGreaterThan(0);
      expect(guards.cspViolations.join('\n')).toContain('script-src');
      guards.cspViolations.length = 0;
    },
  );

  // A top-level navigation: against the stack, the CSP already stops any fetch to another origin from the page.
  test('RT-05: a request to an external origin is blocked and recorded', async ({ page, guards }) => {
    await expect(page.goto('https://example.com/')).rejects.toThrow();

    expect(guards.blockedRequests).toEqual(['https://example.com/']);
    guards.blockedRequests.length = 0;
  });

  test('RT-05: the exchange-rate API answers with the reference rates, never the real service', async ({
    page,
  }) => {
    await page.goto('/customers/new');

    const body = await page.evaluate(async () => {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR');
      return (await response.json()) as { base_code: string; rates: Record<string, number> };
    });

    expect(body.base_code).toBe('EUR');
    expect(body.rates['GBP']).toBe(0.835919);
  });
});

/** The layout checks of AC-84 fail when they should: otherwise a test at 360 px would pass on any page. */
test.describe('AC-84 layout checks', () => {
  test.use({ viewport: NARROW_VIEWPORT });

  const LONG = 'X'.repeat(200);

  test('AC-84: a page wider than the window fails the horizontal scroll check', async ({ page }) => {
    await page.setContent(`<p style="width: 600px">${LONG}</p>`);

    await expect(expectNoHorizontalScroll(page)).rejects.toThrow('horizontal overflow');
  });

  test('AC-84: text cut by an ellipsis or by a clipping ancestor fails the visibility check', async ({
    page,
  }) => {
    await page.setContent(
      `<p id="ellipsis" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis">${LONG}</p>` +
        `<div style="overflow: hidden; width: 100px"><span id="clipped" style="white-space: nowrap">${LONG}</span></div>` +
        `<p id="wrapped" style="overflow-wrap: anywhere">${LONG}</p>`,
    );

    await expect(expectTextFullyVisible(page.locator('#ellipsis'))).rejects.toThrow('has an ellipsis');
    await expect(expectTextFullyVisible(page.locator('#clipped'))).rejects.toThrow('cuts its content');
    await expectTextFullyVisible(page.locator('#wrapped'));
  });
});
