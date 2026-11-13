import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/** AC-86, RNF-13: the rules of WCAG 2.1 A and AA (contrast 4.5:1 included). */
const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/** D-156: «grave» means serious or critical; the rest is attached to the report and does not fail the test. */
const BLOCKING_IMPACTS: ReadonlySet<string> = new Set(['serious', 'critical']);

interface Finding {
  readonly id: string;
  readonly impact: string;
  readonly targets: string;
}

/** Runs axe on the page as it is now and fails on any serious or critical violation (AC-86, D-156). */
export async function expectNoSeriousA11yViolations(page: Page, view: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze();
  const findings: Finding[] = violations.map(({ id, impact, nodes }) => ({
    id,
    impact: impact ?? 'unknown',
    targets: nodes.map(({ target }) => target.join(' ')).join(' | '),
  }));
  const minor = findings.filter(({ impact }) => !BLOCKING_IMPACTS.has(impact));
  if (minor.length > 0) {
    await test.info().attach(`axe · ${view} · not blocking`, {
      body: JSON.stringify(minor, null, 2),
      contentType: 'application/json',
    });
  }

  const blocking = findings.filter(({ impact }) => BLOCKING_IMPACTS.has(impact));
  expect(
    blocking.map(({ id, impact, targets }) => `${id} (${impact}): ${targets}`),
    `serious or critical axe violations in ${view}`,
  ).toEqual([]);
}
