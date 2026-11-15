// @ts-check
/**
 * The cards of the system map (D-192): the idea it shows, one per piece and one per flow, and the controls that
 * step through a flow. They are complete without script; `esquema.js` shows one at a time.
 */
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';
import { icon } from './icons.mjs';
import { renderPaths } from './paths.mjs';
import { renderReferences } from './references.mjs';

export function renderIntro() {
  return markup`<article id="esquema-idea" class="sys-card sys-intro" aria-labelledby="esquema-idea-titulo">
    <h3 id="esquema-idea-titulo">La regla vive una sola vez</h3>
    <p class="sys-idea">
      <a href="${githubUrl('packages/domain')}"><code>packages/domain</code></a> corre en el navegador para
      proyectar la factura al instante y en la API para guardarla. La API siempre recalcula: nunca se fía de un
      importe del cliente.
    </p>
    <p>Pulsa cualquier pieza para ver qué hace, por qué es así, dónde está su código y qué test la comprueba.</p>
    <p>O elige un recorrido y sigue una petición paso a paso, con sus números reales.</p>
  </article>`;
}

/**
 * @param {import('../content/architecture.mjs').Piece} piece
 * @param {import('../content/architecture.mjs').Zone} zone
 */
export function renderPieceCard(piece, zone) {
  const id = `pieza-${piece.id}`;
  return markup`<article id="${id}" class="sys-card" aria-labelledby="${id}-titulo" tabindex="-1">
    <h3 id="${id}-titulo">${piece.name} <span>${zone.label.split(':')[0]}</span></h3>
    <p>${piece.does}</p>
    ${
      piece.control === undefined
        ? ''
        : markup`<p class="sys-control">${icon('shield')}<span>${piece.control}</span></p>`
    }
    <h4>Por qué es así</h4>
    ${renderReferences(piece.refs)} ${renderPaths(piece.files, 'file', 'Dónde está')}
    ${piece.tests.length > 0 ? renderPaths(piece.tests, 'test', 'Qué lo prueba') : ''}
  </article>`;
}

/**
 * @param {import('../content/request-flows.mjs').FlowStep} step
 * @param {string} id
 */
function renderStep(step, id) {
  return markup`<li
    id="${id}"
    class="sys-step"
    data-lit="${step.lit.join(' ')}"
    data-edges="${step.edges.join(' ')}"
    data-label="${step.label ?? ''}"
  >
    <h4>${step.title}</h4>
    <p>${step.text}</p>
    ${step.example === undefined ? '' : markup`<p class="sys-example"><code>${step.example}</code></p>`}
    ${renderReferences(step.refs)} ${renderPaths(step.tests, 'test', 'Qué lo prueba')}
  </li>`;
}

/** @param {import('../content/request-flows.mjs').RequestFlow} flow */
export function renderFlowCard(flow) {
  const id = `flujo-${flow.id}`;
  return markup`<article id="${id}" class="sys-card sys-flow" aria-labelledby="${id}-titulo" tabindex="-1">
    <h3 id="${id}-titulo">${flow.name}</h3>
    <p class="sys-summary">${flow.summary}</p>
    <ol class="sys-steps">
      ${flow.steps.map((step, index) => renderStep(step, `${id}-${index + 1}`))}
    </ol>
  </article>`;
}

/** The controls of a flow: filled in and shown by the page script. */
export function renderStepNav() {
  return markup`<div class="sys-nav" data-sys-nav hidden>
    <p class="sys-count" aria-live="polite" data-sys-count></p>
    <div class="sys-progress" aria-hidden="true" data-sys-progress></div>
    <div class="sys-nav-buttons">
      <button type="button" class="btn btn-secondary" data-sys-prev>Anterior</button>
      <button type="button" class="btn btn-primary" data-sys-next>Siguiente</button>
      <button type="button" class="btn-link sys-play" data-sys-play aria-pressed="false">Reproducir</button>
    </div>
    <p class="sys-hint">También con las flechas del teclado; Esc vuelve a explorar.</p>
  </div>`;
}
