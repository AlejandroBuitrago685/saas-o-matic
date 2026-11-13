import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

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

  it('AC-83 links the exchange rate attribution in the footer (RF-18)', async () => {
    const attribution = (await renderShell()).querySelector<HTMLAnchorElement>('footer a');

    expect(attribution?.textContent.trim()).toBe('Rates By Exchange Rate API');
    expect(attribution?.href).toBe('https://www.exchangerate-api.com/');
  });
});
