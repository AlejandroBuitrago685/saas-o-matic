import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CustomerSearchBox } from './customer-search-box';

describe('AC-71 spec 05 §5 search field of the dashboard', () => {
  it('«Borrar» gives the focus back to the field instead of losing it with the button', () => {
    const fixture = TestBed.createComponent(CustomerSearchBox);
    const host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('text', 'acme');
    // The dashboard empties the text when it hears `cleared`, and the button goes away.
    fixture.componentInstance.cleared.subscribe(() => {
      fixture.componentRef.setInput('text', '');
    });
    fixture.detectChanges();
    const clear = host.querySelector('button');
    if (clear === null) throw new Error('No «Borrar» button');

    clear.focus();
    clear.click();
    fixture.detectChanges();

    expect(host.querySelector('button')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#customer-search'));
  });
});
