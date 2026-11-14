import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DemoBanner, IS_DEMO_BUILD } from './demo-banner';

/** The text of spec 05 §2, word for word. */
const NOTICE =
  'Entorno de demostración: los datos son ficticios y se borran periódicamente. No introduzcas datos reales.';

async function render(isDemoBuild?: boolean): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: isDemoBuild === undefined ? [] : [{ provide: IS_DEMO_BUILD, useValue: isDemoBuild }],
  });
  const fixture = TestBed.createComponent(DemoBanner);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('AC-61 D-168 D-169 the demo notice (spec 05 §2, RNF-SEC-20)', () => {
  it('shows the notice of spec 05 §2 in the demo build, as a named landmark', async () => {
    const notice = (await render(true)).querySelector('aside');

    expect(notice?.getAttribute('aria-label')).toBe('Aviso de demostración');
    expect(notice?.textContent.replace(/\s+/g, ' ').trim()).toBe(NOTICE);
  });

  it('has no close button: the notice cannot be dismissed', async () => {
    expect((await render(true)).querySelector('button')).toBeNull();
  });

  it('renders nothing in the internal tool, which is the build by default', async () => {
    expect((await render()).children).toHaveLength(0);
  });

  it('renders nothing when the build says it is not the demo', async () => {
    expect((await render(false)).children).toHaveLength(0);
  });
});
