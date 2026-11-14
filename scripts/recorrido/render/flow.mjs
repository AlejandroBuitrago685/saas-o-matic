// @ts-check
/**
 * The product as a flow (D-183): a strip with the seven steps of a sales rep, and one native disclosure per step with
 * a close-up of its screen, its rule with numbers computed by the domain, the files that implement it and the tests
 * that cover it. The tier step carries the live simulator (D-184).
 */
import { FLOW_STEPS } from '../content/flow.mjs';
import { markup } from '../html.mjs';
import { renderCloseUp } from './close-up.mjs';
import { icon } from './icons.mjs';
import { renderPaths } from './paths.mjs';
import { renderRule } from './rules.mjs';
import { renderSimulator } from './simulator.mjs';

/** @typedef {import('./close-up.mjs').CaptureSizes} CaptureSizes */
/**
 * @typedef {object} FlowData
 * @property {import('./rules.mjs').RuleData} rules
 * @property {CaptureSizes} sizes
 * @property {import('./simulator.mjs').SimulatorData} simulator
 */

/**
 * @param {import('../content/flow.mjs').FlowStep} step
 * @param {number} index
 * @param {FlowData} data
 */
function renderStep(step, index, data) {
  const picture = step.rule === 'tiers' ? renderSimulator(step, data) : renderCloseUp(step, data.sizes);
  return markup`<li class="flow-step">
    <details id="${step.id}" ${index === 0 ? markup` open` : ''}>
      <summary>
        <span class="flow-marker" aria-hidden="true">${index + 1}</span>
        <span class="flow-heading"
          ><span class="flow-title">${step.title}</span><span class="flow-lead">${step.lead}</span></span
        >
      </summary>
      <div class="flow-body">
        ${picture}
        <div class="flow-detail">
          <div class="rule">
            <h3>La regla</h3>
            ${renderRule(step.rule, data.rules)}
            <p class="refs">${step.criteria.join(' · ')}</p>
          </div>
          ${renderPaths(step.files, 'file', 'Dónde está')} ${renderPaths(step.tests, 'test', 'Qué lo prueba')}
        </div>
      </div>
    </details>
  </li>`;
}

/** The seven steps in a row: each link opens its step (the page script) or, without script, jumps to it. */
function renderStrip() {
  return markup`<nav class="flow-strip" aria-label="Pasos del flujo">
    <ol>
      ${FLOW_STEPS.map(
        (step, index) =>
          markup`<li>
            <a href="#${step.id}" data-step="${step.id}"
              ><span class="flow-strip-icon">${icon(step.icon)}</span
              ><span class="flow-strip-name"
                ><span class="visually-hidden">Paso ${index + 1}: </span>${step.title}</span
              ></a
            >
          </li>`,
      )}
    </ol>
  </nav>`;
}

/** @param {FlowData} data */
export function renderFlow(data) {
  return markup`<header class="section-head">
      <h2 id="producto-titulo">El producto, <span class="accent">paso a paso</span></h2>
      <p>
        El camino de un comercial por la aplicación. Pulsa un paso para ver su pantalla, la regla con un
        ejemplo de números reales, dónde está el código y qué test la cubre.
      </p>
    </header>
    ${renderStrip()}
    <ol class="flow">
      ${FLOW_STEPS.map((step, index) => renderStep(step, index, data))}
    </ol>`;
}
