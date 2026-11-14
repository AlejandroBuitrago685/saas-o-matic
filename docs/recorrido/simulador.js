// The live tier simulator of the evaluator walkthrough (D-184). It imports the compiled domain package, the same code
// the API and the web run (copied next to the page by `npm run recorrido`), and repeats none of its rules: positions
// of the slider, catalog validation, tiers, tax and rounding all come from the package.
import {
  calculatePricing,
  positionToUsers,
  tariffForPlan,
  taxRateFor,
  validateCatalog,
} from './domain/index.js';

const root = document.querySelector('[data-simulator]');
const fallback = document.querySelector('[data-simulator-fallback]');
const catalogData = document.getElementById('catalogo-simulador');
const slider = document.getElementById('sim-usuarios');
const country = document.getElementById('sim-pais');
const usersOutput = document.getElementById('sim-usuarios-valor');

const integer = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const formatEuros = (cents) => euros.format(cents / 100);
/** Groups of thousands joined by a space («1 000»), as the rest of the page writes them: only the group parts change. */
const formatInteger = (value) =>
  integer
    .formatToParts(value)
    .map((part) => (part.type === 'group' ? ' ' : part.value))
    .join('');

/** Writes `text` in the element of `field` inside `scope` (textContent only: no markup is ever built). */
function setField(scope, field, text) {
  const element = scope.querySelector(`[data-field="${field}"]`);
  if (element !== null) element.textContent = text;
}

/** The base split by tier: the same proportional bars as the cover (widths are SVG attributes, not inline styles). */
function drawTierBar(pricing) {
  let start = 0;
  for (const line of pricing.tiers) {
    const rect = root.querySelector(`.tier-bar .tier-${line.tier}`);
    const width = pricing.baseCents === 0 ? 0 : (100 * line.subtotalCents) / pricing.baseCents;
    rect?.setAttribute('x', start.toFixed(2));
    rect?.setAttribute('width', Math.max(0, width - 0.6).toFixed(2));
    start += width;
  }
}

function render(catalog) {
  // The slider only offers valid positions and the catalog is validated at start: neither result can fail here, and
  // if one did, the panel would keep its last numbers rather than show a wrong one.
  const users = positionToUsers(Number(slider.value));
  if (!users.ok) return;
  const taxRateBps = taxRateFor(catalog, country.value);
  // Every plan uses the STANDARD tariff (D-08): any plan gives the same numbers.
  const pricing = calculatePricing(tariffForPlan(catalog, 'STARTER'), users.value, taxRateBps);
  if (!pricing.ok) return;
  const shown = formatInteger(users.value);
  usersOutput.textContent = shown;
  slider.setAttribute('aria-valuetext', `${shown} usuarios`);
  for (const line of pricing.value.tiers) {
    const row = root.querySelector(`[data-tier="${line.tier}"]`);
    if (row === null) continue;
    setField(row, 'units', formatInteger(line.units));
    setField(row, 'subtotal', formatEuros(line.subtotalCents));
  }
  setField(root, 'base', formatEuros(pricing.value.baseCents));
  setField(root, 'rate', `${percent.format(taxRateBps / 100)} %`);
  setField(root, 'tax', formatEuros(pricing.value.taxCents));
  setField(root, 'total', formatEuros(pricing.value.totalCents));
  drawTierBar(pricing.value);
}

function start() {
  if ([root, fallback, catalogData, slider, country, usersOutput].includes(null)) return;
  // If the catalog data of the page were broken, the step keeps its close-up and its notice instead of a simulator.
  const catalog = validateCatalog(JSON.parse(catalogData.textContent ?? ''));
  if (!catalog.ok) return;
  const update = () => render(catalog.value);
  slider.addEventListener('input', update);
  country.addEventListener('change', update);
  update();
  fallback.hidden = true;
  root.hidden = false;
}

start();
