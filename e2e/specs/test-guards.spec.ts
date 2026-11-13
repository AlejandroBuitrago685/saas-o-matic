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
