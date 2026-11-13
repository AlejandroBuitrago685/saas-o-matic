import { expect, type Locator, type Page } from '@playwright/test';

/** AC-84, CL-50: the narrowest window the interface supports (RNF-07). */
export const NARROW_VIEWPORT = { width: 360, height: 800 } as const;

/** AC-84: the page never scrolls sideways; the overflow, if any, is reported in pixels. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'horizontal overflow of the page, in px').toBeLessThanOrEqual(0);
}

/**
 * AC-84: the whole text of `locator` can be read. Nothing cuts it: neither the element nor an ancestor that clips its
 * overflow is narrower than its content, no ellipsis is used, and it ends inside the window.
 */
export async function expectTextFullyVisible(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const clipped = await locator.evaluate((element) => {
    const describe = (node: Element): string => `${node.tagName.toLowerCase()}.${node.classList.value}`;
    const isClipping = (node: Element): boolean => {
      const { overflowX } = getComputedStyle(node);
      return node === element || overflowX === 'hidden' || overflowX === 'clip';
    };
    const problems: string[] = [];
    if (getComputedStyle(element).textOverflow === 'ellipsis')
      problems.push(`${describe(element)} has an ellipsis`);
    if (element.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5) {
      problems.push(`${describe(element)} ends outside the window`);
    }
    for (
      let node: Element | null = element;
      node !== null && node !== document.body;
      node = node.parentElement
    ) {
      if (isClipping(node) && node.scrollWidth > node.clientWidth + 1)
        problems.push(`${describe(node)} cuts its content`);
    }
    return problems;
  });
  expect(clipped, 'text cut at 360 px').toEqual([]);
}
