import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { IS_DEMO_BUILD } from './core/layout/demo-banner';

async function renderShell(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('D-122 application shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the SaaS-O-Matic wordmark in the header, linking to the start page', async () => {
    const link = (await renderShell()).querySelector<HTMLAnchorElement>('header a');

    expect(link?.textContent.trim()).toBe('SaaS-O-Matic');
    expect(link?.getAttribute('href')).toBe('/');
  });

  it('hosts the router outlet inside <main>, reachable from a skip link', async () => {
    const host = await renderShell();

    expect(host.querySelector('main#main router-outlet')).not.toBeNull();
    expect(host.querySelector('a[href="#main"]')?.textContent.trim()).toBe('Saltar al contenido');
  });

  it('mentions the technical test discreetly in the footer, with no Roams branding elsewhere', async () => {
    const host = await renderShell();

    expect(host.querySelector('footer')?.textContent).toContain('Prueba técnica para Roams');
    expect(host.querySelector('header')?.textContent).not.toContain('Roams');
  });

  it('AC-61 D-168 shows no demo notice in the internal tool', async () => {
    expect((await renderShell()).querySelector('aside[aria-label="Aviso de demostración"]')).toBeNull();
  });

  it('AC-83 links the exchange rate attribution in the footer (RF-18)', async () => {
    const attribution = (await renderShell()).querySelector<HTMLAnchorElement>('footer a');

    expect(attribution?.textContent.trim()).toBe('Rates By Exchange Rate API');
    expect(attribution?.href).toBe('https://www.exchangerate-api.com/');
  });
});

describe('AC-61 D-168 application shell of the demo build', () => {
  it('puts the demo notice above the header, outside the sticky part, so it scrolls with the page', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: IS_DEMO_BUILD, useValue: true }],
    }).compileComponents();
    const host = await renderShell();

    const notice = host.querySelector('aside[aria-label="Aviso de demostración"]');
    const header = host.querySelector('app-header');
    expect(notice).not.toBeNull();
    expect(header).not.toBeNull();
    if (notice === null || header === null) return;
    expect(notice.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.closest('.sticky')).toBeNull();
  });
});
