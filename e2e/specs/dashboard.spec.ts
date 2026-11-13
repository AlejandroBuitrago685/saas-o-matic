import type { Page, Route } from '@playwright/test';

import {
  answerListing,
  customerPage,
  customerSummary,
  isListing,
  pageOf,
  queryOf,
} from '../fixtures/customer-pages.js';
import { createCustomer, syntheticDni } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

const cards = (page: Page) => page.getByRole('list', { name: 'Clientes' }).getByRole('link');
const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar por empresa o identificador fiscal' });
const pagination = (page: Page) => page.getByRole('navigation', { name: 'Paginación' });

const ACME = pageOf([customerSummary(1, 'Acme S.L.')]);
const SLOW_AC = pageOf([customerSummary(1, 'Acme S.L.'), customerSummary(2, 'Acero Canario S.A.')]);
const SLOW_MS = 1_500;

/** A 500 with Problem Details, as the API answers an unexpected error. */
const failure = (route: Route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/problem+json',
    json: { type: 'about:blank', title: 'Error interno', status: 500, code: 'INTERNAL_ERROR' },
  });

/**
 * The listing answers «ac» 1.5 s late and everything else at once. Returns the late answer to wait for. When «acme»
 * starts, the page cancels the request of «ac» (CL-42) and there is nothing left to answer; if it ever did not, the
 * answer arrives late and the test checks that it does not replace the list of «acme».
 */
async function answerAcLate(page: Page): Promise<() => Promise<void>> {
  let late: Promise<void> = Promise.resolve();
  const answerLate = async (route: Route): Promise<void> => {
    const isCancelled = await page
      .waitForEvent('requestfailed', { predicate: (failed) => failed === route.request(), timeout: SLOW_MS })
      .then(
        () => true,
        // The timeout is the other expected outcome: the request is still open after 1.5 s.
        () => false,
      );
    if (!isCancelled) await route.fulfill({ json: SLOW_AC });
  };
  await page.route(isListing, (route) => {
    const { q } = queryOf(route.request());
    if (q !== 'ac') return route.fulfill({ json: q === null ? customerPage(25) : ACME });
    late = answerLate(route);
    return late;
  });
  return () => late;
}

test('AC-70: without customers, the empty state leads to the create form', async ({ page }) => {
  await answerListing(page, () => customerPage(0));
  await page.goto('/');

  await expect(page.getByText('Todavía no hay clientes')).toBeVisible();
  await page.getByRole('link', { name: 'Crear el primer cliente' }).click();

  await expect(page).toHaveURL(/\/customers\/new$/);
});

test('AC-70: with 25 customers, 20 cards and «1–20 de 25», and «Siguiente» shows the 5 left', async ({
  page,
}) => {
  await answerListing(page, (request) => customerPage(25, queryOf(request).offset));
  await page.goto('/');

  await expect(cards(page)).toHaveCount(20);
  await expect(pagination(page)).toContainText('1–20 de 25');
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await expect(cards(page)).toHaveCount(5);
  await expect(pagination(page)).toContainText('21–25 de 25');
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
});

test('AC-70: an error of the API shows «Reintentar», keeps the search, and retrying loads the list', async ({
  page,
}) => {
  let calls = 0;
  await page.route(isListing, (route) => {
    calls += 1;
    return calls === 1 ? failure(route) : route.fulfill({ json: customerPage(3) });
  });
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar el listado.');
  await expect(searchBox(page)).toBeEnabled();
  await page.getByRole('button', { name: 'Reintentar' }).click();

  await expect(cards(page)).toHaveCount(3);
});

test('AC-70: the skeleton is visible while the first page loads', async ({ page }) => {
  let release = (): void => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await answerListing(page, async () => {
    await released;
    return customerPage(2);
  });
  await page.goto('/');

  await expect(page.getByTestId('customer-skeleton')).toHaveCount(6);
  await expect(page.getByRole('status').filter({ hasText: 'Cargando clientes…' })).toBeAttached();
  release();

  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByTestId('customer-skeleton')).toHaveCount(0);
});

test('AC-71: typing «acme» in a row sends a single search, and the list is its answer', async ({ page }) => {
  const searched: string[] = [];
  await answerListing(page, (request) => {
    const { q } = queryOf(request);
    if (q === null) return customerPage(25);
    searched.push(q);
    return ACME;
  });
  await page.goto('/');
  await expect(cards(page)).toHaveCount(20);

  await searchBox(page).pressSequentially('acme', { delay: 60 });

  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toHaveAccessibleName('Acme S.L.');
  expect(searched).toEqual(['acme']);
});

test('AC-71 CL-42: a slow answer to «ac» never replaces the list of «acme»', async ({ page }) => {
  const lateAnswer = await answerAcLate(page);
  await page.goto('/');
  await expect(cards(page)).toHaveCount(20);

  const askedForAc = page.waitForRequest(
    (request) => isListing(new URL(request.url())) && queryOf(request).q === 'ac',
  );
  await searchBox(page).fill('ac');
  await askedForAc;
  await searchBox(page).press('End');
  await searchBox(page).pressSequentially('me');
  await expect(cards(page)).toHaveCount(1);
  await lateAnswer();

  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByText('Acero Canario S.A.')).toHaveCount(0);
});

test('AC-71: no matches names the query, and «Limpiar búsqueda» empties the field', async ({
  page,
  request,
}) => {
  await createCustomer(request);
  const nonsense = `sin-resultados-${syntheticDni()}`;
  await page.goto('/');

  await searchBox(page).fill(nonsense);
  await searchBox(page).press('Enter');

  await expect(page.getByText(`No hay clientes que coincidan con «${nonsense}»`)).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await expect(searchBox(page)).toHaveValue('');
  await expect(cards(page).first()).toBeVisible();
});

test('AC-30 AC-71: a customer is found by its tax id written with a hyphen, and its card opens the detail', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const written = `${customer.taxId.slice(0, 4)}-${customer.taxId.slice(4).toLowerCase()}`;
  await page.goto('/');

  await searchBox(page).fill(written);
  await searchBox(page).press('Enter');
  await expect(cards(page)).toHaveCount(1);
  await cards(page).click();

  await expect(page).toHaveURL(new RegExp(`/customers/${customer.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: customer.companyName })).toBeVisible();
});

test('AC-70: «Clientes» in the header leads back to the listing', async ({ page, request }) => {
  const customer = await createCustomer(request);
  await page.goto(`/customers/${customer.id}`);
  await expect(page.getByRole('heading', { level: 1, name: customer.companyName })).toBeVisible();
  const clientes = page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Clientes' });

  await clientes.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(clientes).toHaveAttribute('aria-current', 'page');
});
