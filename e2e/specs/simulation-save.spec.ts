import { euros } from '../fixtures/amounts.js';
import { listSimulations } from '../fixtures/customers.js';
import { openSimulator } from '../fixtures/simulator.js';
import { expect, test } from '../fixtures/test.js';

test('AC-78 TV-PR-06: a saved simulation of 51 users heads the history with the amounts of the projection', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);
  await expect(
    page.getByText('Aún no hay simulaciones. Usa el simulador para crear la primera.'),
  ).toBeVisible();

  await simulator.usersField.fill('51');
  await expect(simulator.total).toHaveText(euros('514,25'));
  await simulator.saveButton.click();

  await expect(page.getByText('Simulación guardada')).toBeVisible();
  const card = page.getByRole('list', { name: 'Simulaciones guardadas' }).getByRole('listitem').first();
  const cardLine = (label: string) => card.locator('dl > div').filter({ hasText: label }).locator('dd');
  await expect(cardLine('Base mensual')).toHaveText(euros('425,00'));
  await expect(cardLine('Impuesto')).toHaveText(euros('89,25'));
  await expect(card.getByText(/^\s*Total mensual:\s*514,25\s€\s*$/)).toBeVisible();
  await expect(cardLine('Base mensual')).toHaveText(
    (await simulator.projectionLine('Base mensual').textContent()) ?? '',
  );
  await expect(cardLine('Impuesto')).toHaveText(
    (await simulator.projectionLine(/^Impuesto/).textContent()) ?? '',
  );
});

test('AC-89: a double click on «Guardar simulación» creates a single simulation', async ({
  page,
  request,
}) => {
  const simulator = await openSimulator(page, request);
  let posts = 0;
  page.on('request', (sent) => {
    if (sent.method() === 'POST' && new URL(sent.url()).pathname === '/api/simulations') posts += 1;
  });

  await simulator.usersField.fill('20');
  await simulator.saveButton.dblclick();

  await expect(page.getByText('Simulación guardada')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Simulaciones guardadas' }).getByRole('listitem')).toHaveCount(
    1,
  );
  expect(posts).toBe(1);
  expect((await listSimulations(request, simulator.customer.id)).items).toHaveLength(1);
});
