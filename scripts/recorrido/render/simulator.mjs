// @ts-check
/**
 * The live tier simulator of the tier step (D-184). The markup is rendered here with the numbers of the first state,
 * computed by the domain; `simulador.js` imports the compiled domain package as a module and recomputes on every
 * change. Until it loads (and always from file://, where modules do not load) the step shows its close-up and a
 * notice instead.
 */
import { euros, integer, percent } from '../format.mjs';
import { markup, raw } from '../html.mjs';
import { PAGES_URL } from '../repo-links.mjs';
import { renderCloseUp } from './close-up.mjs';
import { renderTierBar } from './projection.mjs';

/**
 * @typedef {object} SimulatorData
 * @property {import('@saas-o-matic/domain').CatalogInput} catalog the catalog of the API, as the module validates it
 * @property {import('../sources/examples.mjs').PricingExample} example the first state
 * @property {number} position the slider position of the first state (`usersToPosition`)
 * @property {number} maxPosition
 */

/**
 * JSON inside a `<script>` element is raw text: entities are not decoded, so it is not HTML-escaped. A `<` is written
 * as its JSON escape instead, so no value can close the element.
 * @param {unknown} value
 */
function jsonData(value) {
  return raw(JSON.stringify(value).replace(/</g, `${String.fromCharCode(92)}u003c`));
}

/** @param {import('../sources/examples.mjs').PricingExample} example */
function renderLines(example) {
  return markup`<dl class="projection-lines">
    ${example.tiers.map(
      (line) =>
        markup`<div data-tier="${line.tier}">
          <dt>
            Tramo ${line.tier} · <span data-field="units">${integer(line.units)}</span> ×
            ${euros(line.unitPriceCents)}
          </dt>
          <dd class="amount" data-field="subtotal">${euros(line.subtotalCents)}</dd>
        </div>`,
    )}
    <div class="projection-base">
      <dt>Base mensual</dt>
      <dd class="amount" data-field="base">${euros(example.baseCents)}</dd>
    </div>
    <div>
      <dt>Impuesto (<span data-field="rate">${percent(example.taxRateBps)}</span>)</dt>
      <dd class="amount" data-field="tax">${euros(example.taxCents)}</dd>
    </div>
  </dl>`;
}

/** @param {SimulatorData} data */
function renderControls({ example, catalog, position, maxPosition }) {
  const options = catalog.countries.map(
    (country) =>
      markup`<option value="${country.code}"${country.code === example.country ? markup` selected` : ''}>${country.code} · ${percent(country.taxRateBps)}</option>`,
  );
  return markup`<div class="mini-sim-controls">
    <div class="mini-sim-field">
      <label for="sim-usuarios">Usuarios activos</label>
      <output id="sim-usuarios-valor" for="sim-usuarios" class="amount">${integer(example.users)}</output>
      <input id="sim-usuarios" class="range" type="range" min="0" max="${maxPosition}" step="1" value="${position}" aria-valuetext="${integer(example.users)} usuarios" />
    </div>
    <div class="mini-sim-field">
      <label for="sim-pais">País del cliente</label>
      <select id="sim-pais">${options}</select>
    </div>
  </div>`;
}

/** @param {SimulatorData} data */
function renderLive(data) {
  const { example, catalog } = data;
  return markup`<div class="mini-sim" data-simulator hidden>
    ${renderControls(data)}
    <div class="projection projection-live">
      <p class="projection-label">Total mensual</p>
      <p class="projection-total amount" data-field="total" aria-live="polite">${euros(example.totalCents)}</p>
      ${renderTierBar(example)}
      ${renderLines(example)}
    </div>
    <p class="mini-sim-note">Cada número lo calcula <code>calculatePricing</code> del paquete <code>domain</code> compilado, el mismo que usan la API y la web, importado aquí como módulo.</p>
    <script type="application/json" id="catalogo-simulador">${jsonData(catalog)}</script>
  </div>`;
}

/**
 * @param {import('../content/flow.mjs').FlowStep} step
 * @param {{ sizes: import('./close-up.mjs').CaptureSizes, simulator: SimulatorData }} data
 */
export function renderSimulator(step, data) {
  return markup`<div class="shot-slot">
    ${renderLive(data.simulator)}
    <div data-simulator-fallback>
      ${renderCloseUp(step, data.sizes)}
      <p class="notice">
        El simulador en vivo importa el paquete <code>domain</code> compilado como módulo, y los navegadores
        no cargan módulos desde un fichero local. Pruébalo en la
        <a href="${PAGES_URL}#${step.id}">versión publicada</a>.
      </p>
    </div>
  </div>`;
}
