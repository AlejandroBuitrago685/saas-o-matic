import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TierLabel } from './tier-label';

/** The tests compare without telling apart the kind of space (spec 05 §4.5). */
const plain = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

async function render(label: string): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(TierLabel);
  fixture.componentRef.setInput('label', label);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('D-191 a tier label keeps its text while it wraps between its parts', () => {
  it.each([
    'Tramo 1 · usuarios 1–10 · 10 × 10,00 €',
    'Tramo 3 · usuarios desde 51 · 9950 × 5,00 €',
    'Tramo 1 · 10 × 10,00 €',
    'Tramo 1',
  ])('AC-76 reads «%s» exactly as the label of spec 05 §3.4', async (label) => {
    expect(plain((await render(label)).textContent)).toBe(label);
  });

  it('puts the tier in bold and the quantity and price on their own line when the card is narrow', async () => {
    const host = await render('Tramo 2 · usuarios 11–50 · 5 × 8,00 €');
    const parts = [...host.querySelectorAll('span')];

    expect(parts[0]?.textContent).toBe('Tramo 2');
    expect(parts[0]?.classList.contains('font-semibold')).toBe(true);
    // The last separator only for screen readers until the card has room, so no «·» ends a line.
    expect(parts.at(-2)?.classList.contains('sr-only')).toBe(true);
    expect(parts.at(-1)?.textContent).toBe('5 × 8,00 €');
    expect(parts.at(-1)?.classList.contains('block')).toBe(true);
  });
});
