// @ts-check
/**
 * The projection of the simulator as the application draws it (the panel with a 3 px lavender border, 10-diseno-visual
 * §1.2), filled with numbers computed by the compiled domain.
 */
import { euros, num, percent } from '../format.mjs';
import { markup } from '../html.mjs';

/**
 * The base split by tier, as proportional bars: an SVG, because the widths are data and the policy forbids inline
 * styles. Decorative: the same amounts are listed next to it.
 * @param {import('../sources/examples.mjs').PricingExample} example
 */
export function renderTierBar(example) {
  let start = 0;
  const parts = example.tiers.map((line) => {
    const width = (100 * line.subtotalCents) / example.baseCents;
    const part = markup`<rect
      class="tier-${line.tier}"
      x="${start.toFixed(2)}"
      y="0"
      width="${Math.max(0, width - 0.6).toFixed(2)}"
      height="8"
      rx="1.5"
    />`;
    start += width;
    return part;
  });
  return markup`<svg
    class="tier-bar"
    viewBox="0 0 100 8"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    ${parts}
  </svg>`;
}

/**
 * @param {import('../sources/examples.mjs').PricingExample} example
 * @param {string} vectorId
 */
export function renderProjection(example, vectorId) {
  return markup`<figure class="projection" aria-labelledby="proyeccion-pie">
    <p class="projection-label">Total mensual</p>
    <p class="projection-total amount">${euros(example.totalCents)}</p>
    ${renderTierBar(example)}
    <dl class="projection-lines">
      ${example.tiers.map(
        (line) =>
          markup`<div>
            <dt>Tramo ${line.tier} · ${line.units} × ${euros(line.unitPriceCents)}</dt>
            <dd class="amount">${euros(line.subtotalCents)}</dd>
          </div>`,
      )}
      <div class="projection-base">
        <dt>Base mensual</dt>
        <dd class="amount">${euros(example.baseCents)}</dd>
      </div>
      <div>
        <dt>Impuesto (${example.country}, ${percent(example.taxRateBps)})</dt>
        <dd class="amount">${euros(example.taxCents)}</dd>
      </div>
    </dl>
    <figcaption id="proyeccion-pie">
      ${num(example.users)} usuarios en España, calculado por el paquete <code>domain</code> al generar
      esta página (${vectorId}).
    </figcaption>
  </figure>`;
}
