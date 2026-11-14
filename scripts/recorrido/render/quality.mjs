// @ts-check
/**
 * Quality (D-183): the jobs of the CI with their steps, the test files of each layer and the traceability, all read
 * from the repository (ci.yml, the test files and the specification).
 */
import { num } from '../format.mjs';
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';
import { CI_FILE } from '../sources/quality.mjs';

/**
 * @typedef {object} QualityData
 * @property {import('../sources/quality.mjs').CiJob[]} jobs
 * @property {import('../sources/quality.mjs').TestLayer[]} layers
 * @property {import('../sources/quality.mjs').CriteriaCount} criteria
 * @property {number} vectors
 * @property {{ node: number, web: number }} tests
 */

/** `quality (Node ${{ matrix.node }})` → `quality`: the expressions of the workflow are not for readers. */
const jobName = (/** @type {string} */ name) => name.replace(/\s*\(.*\$\{\{.*\}\}.*\)\s*$/, '');

/** @param {QualityData} data */
function renderPipeline(data) {
  return markup`<ol class="pipeline">
    ${data.jobs.map(
      (job) =>
        markup`<li class="pipeline-job">
          <details>
            <summary>
              <span class="pipeline-name">${jobName(job.name)}</span
              ><span class="pipeline-count">${job.steps.length} pasos</span>
            </summary>
            <ol class="pipeline-steps">
              ${job.steps.map((step) => markup`<li>${step}</li>`)}
            </ol>
          </details>
        </li>`,
    )}
  </ol>`;
}

/** @param {QualityData} data */
function renderLayers(data) {
  const max = Math.max(...data.layers.map((layer) => layer.files));
  return markup`<table class="layers">
    <caption class="visually-hidden">
      Ficheros de test por capa
    </caption>
    <thead>
      <tr>
        <th scope="col">Capa</th>
        <th scope="col">Ficheros de test</th>
      </tr>
    </thead>
    <tbody>
      ${data.layers.map(
        (layer) =>
          markup`<tr>
            <th scope="row"><a href="${githubUrl(layer.folder)}">${layer.layer}</a></th>
            <td>
              <span class="layer-bar"
                ><svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <rect
                    x="0"
                    y="0"
                    width="${((100 * layer.files) / max).toFixed(1)}"
                    height="10"
                    rx="2"
                  /></svg></span
              ><span class="amount">${num(layer.files)}</span>
            </td>
          </tr>`,
      )}
    </tbody>
  </table>`;
}

/** @param {QualityData} data */
function renderTrace({ criteria, vectors }) {
  return markup`<ol class="trace">
    <li><strong>Requisito</strong><span>RF, RNF y RNF-SEC del análisis</span></li>
    <li><strong>${num(criteria.total)} criterios</strong><span>${num(criteria.automated)} con test; ${criteria.reviewOnly.join(' y ')}, de revisión</span></li>
    <li><strong>${num(vectors)} vectores</strong><span>entradas y salidas exactas</span></li>
    <li><strong>Test</strong><span>cita su AC o TV en el título</span></li>
  </ol>`;
}

/** @param {QualityData} data */
export function renderQuality(data) {
  const { tests } = data;
  return markup`<header class="section-head">
      <h2 id="calidad-titulo">Calidad que <span class="accent">se comprueba sola</span></h2>
      <p>Nada se integra en main sin el CI en verde. Las reglas de CLAUDE.md marcadas con ⚙ las hace cumplir una herramienta que también tiene sus tests.</p>
    </header>
    <div class="quality">
      <div class="quality-block">
        <h3><a href="${githubUrl(CI_FILE)}">El pipeline</a></h3>
        <p>${data.jobs.length} trabajos, leídos de <code>ci.yml</code>. Abre uno para ver sus pasos.</p>
        ${renderPipeline(data)}
      </div>
      <div class="quality-block">
        <h3>Tests por capa</h3>
        <p>${num(tests.node + tests.web)} tests en el clon limpio: ${num(tests.node)} de Node y ${num(tests.web)} de la web, más los e2e.</p>
        ${renderLayers(data)}
      </div>
      <div class="quality-block">
        <h3><a href="${githubUrl('ai-workspace/02-especificacion/08-trazabilidad.md')}">Trazabilidad</a></h3>
        ${renderTrace(data)}
        <p><a href="${githubUrl('scripts/trace-tests.mjs')}"><code>npm run trace</code></a> falla en el CI si un criterio automatizable o un vector no lo cita ningún test.</p>
      </div>
    </div>`;
}
