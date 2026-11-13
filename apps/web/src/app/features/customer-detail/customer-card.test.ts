import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CUSTOMER_FIXTURE } from '../../core/testing/catalog.fixture';
import { CustomerCard } from './customer-card';

describe('D-159 AC-84 the email of the customer card', () => {
  it('is the whole address, with a break opportunity after the «@» and each dot, and the same accessible name', async () => {
    const fixture = TestBed.createComponent(CustomerCard);
    fixture.componentRef.setInput('customer', CUSTOMER_FIXTURE);
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href^="mailto:"]',
    );

    // compras@industrias-atlanticas.example: no space or line break slips into the text.
    expect(link?.textContent).toBe(CUSTOMER_FIXTURE.contactEmail);
    expect(link?.getAttribute('href')).toBe(`mailto:${CUSTOMER_FIXTURE.contactEmail}`);
    expect(link?.querySelectorAll('wbr')).toHaveLength(3);
  });
});
