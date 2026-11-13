import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { AppHeader, isCustomersSectionUrl } from './app-header';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

describe('D-122 header: navigation on the left, primary action on the right', () => {
  it.each([
    ['/', true],
    ['/customers/019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b', true],
    ['/customers/019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b?x=1#y', true],
    ['/customers/new', false],
    ['/otra', false],
  ])('«Clientes» is the current section on %s: %s', (url, isCurrent) => {
    expect(isCustomersSectionUrl(url)).toBe(isCurrent);
  });

  async function headerAt(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('offers «Clientes» in the main navigation and «Nuevo cliente» as the primary button', async () => {
    const header = await headerAt('/customers/new');
    const nav = header.querySelector('nav[aria-label="Principal"] a');
    const action = header.querySelector('a.btn-primary');

    expect(nav?.textContent.trim()).toBe('Clientes');
    expect(nav?.getAttribute('href')).toBe('/');
    expect(nav?.hasAttribute('aria-current')).toBe(false);
    expect(action?.textContent.trim()).toBe('Nuevo cliente');
    expect(action?.getAttribute('href')).toBe('/customers/new');
  });

  it('marks «Clientes» with aria-current on a customer detail, never with colour alone', async () => {
    const header = await headerAt('/customers/019a7b2c-4d5e-7f00-8a1b-2c3d4e5f6a7b');

    expect(header.querySelector('nav a')?.getAttribute('aria-current')).toBe('page');
  });
});
