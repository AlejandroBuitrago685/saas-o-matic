import type { Page } from '@playwright/test';

import { answerListing, customerPage, queryOf } from '../fixtures/customer-pages.js';
import { createCustomer } from '../fixtures/customers.js';
import { expect, test } from '../fixtures/test.js';

const cards = (page: Page) => page.getByRole('list', { name: 'Clientes' }).getByRole('link');
const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar por empresa o identificador fiscal' });
const pagination = (page: Page) => page.getByRole('navigation', { name: 'Paginación' });

test('D-163 spec 05 §3.1: the search is in the URL, and survives a reload and a visit to the detail', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  await page.goto('/');

  await searchBox(page).fill(customer.taxId);
  await searchBox(page).press('Enter');
  await expect(page).toHaveURL(`/?q=${customer.taxId}`);
  await expect(cards(page)).toHaveCount(1);

  await page.reload();
  await expect(searchBox(page)).toHaveValue(customer.taxId);
  await expect(cards(page)).toHaveCount(1);

  await cards(page).click();
  await expect(page.getByRole('heading', { level: 1, name: customer.companyName })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`/?q=${customer.taxId}`);
  await expect(searchBox(page)).toHaveValue(customer.taxId);
  await expect(cards(page)).toHaveCount(1);
});

test('D-163: the page is in the URL, replacing the entry, and the «Clientes» link goes back to everything', async ({
  page,
}) => {
  await answerListing(page, (listing) => customerPage(45, queryOf(listing).offset));
  await page.goto('/?page=2');
  await expect(pagination(page).getByText('21–40 de 45')).toBeVisible();
  const entries = await page.evaluate(() => history.length);

  await pagination(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL('/?page=3');
  await expect(pagination(page).getByText('41–45 de 45')).toBeVisible();

  // replaceUrl: no new entry, so «Atrás» leaves the dashboard instead of walking back through its pages.
  expect(await page.evaluate(() => history.length)).toBe(entries);

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes' }).click();
  await expect(page).toHaveURL('/');
  await expect(pagination(page).getByText('1–20 de 45')).toBeVisible();
});

test('D-163: an invalid page in the URL is corrected and never reaches the API', async ({ page }) => {
  const offsets: number[] = [];
  await answerListing(page, (listing) => {
    offsets.push(queryOf(listing).offset);
    return customerPage(25, queryOf(listing).offset);
  });

  await page.goto('/?page=abc');

  await expect(page).toHaveURL('/');
  await expect(pagination(page).getByText('1–20 de 25')).toBeVisible();
  expect(offsets).toEqual([0]);
});
