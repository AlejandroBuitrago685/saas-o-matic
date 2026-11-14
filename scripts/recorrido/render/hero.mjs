// @ts-check
/**
 * The cover (D-183): what the application is in one sentence, the key figures (all read from the repository) and a
 * projection of the simulator computed by the compiled domain, drawn like the projection panel of the application.
 */
import { num } from '../format.mjs';
import { markup } from '../html.mjs';
import { DEMO_URL, githubUrl, REPO_URL } from '../repo-links.mjs';
import { icon } from './icons.mjs';
import { renderProjection } from './projection.mjs';

/**
 * @typedef {object} HeroData
 * @property {import('../sources/quality.mjs').CriteriaCount} criteria
 * @property {number} vectors
 * @property {number} decisions
 * @property {{ node: number, web: number }} tests
 * @property {import('../sources/examples.mjs').PricingExample} example
 * @property {string} vectorId the test vector the example reproduces
 */

/** @param {HeroData} data */
function renderFigures(data) {
  const { criteria, vectors, decisions, tests } = data;
  const reviewed = criteria.reviewOnly.join(' y ');
  return markup`<dl class="figures">
    <div>
      <dt>Criterios de aceptación</dt>
      <dd>
        <strong>${num(criteria.total)}</strong> ${num(criteria.automated)} con test y
        ${num(criteria.reviewOnly.length)} de revisión (${reviewed})
      </dd>
    </div>
    <div>
      <dt>Vectores de prueba</dt>
      <dd>
        <strong>${num(vectors)}</strong> todos citados por un test; <code>npm run trace</code> lo exige en
        el CI
      </dd>
    </div>
    <div>
      <dt>Tests</dt>
      <dd>
        <strong>${num(tests.node + tests.web)}</strong> ${num(tests.node)} de Node y
        ${num(tests.web)} de la web, contados en un clon limpio
      </dd>
    </div>
    <div>
      <dt>Decisiones registradas</dt>
      <dd><strong>${num(decisions)}</strong> cada una con la alternativa descartada y quién la tomó</dd>
    </div>
  </dl>`;
}

/** @param {HeroData} data */
export function renderHero(data) {
  return markup`<div class="hero">
      <div class="hero-text">
        <h1 id="portada-titulo">
          Presupuestos SaaS <span class="accent">multi-divisa</span>, de la regla al test
        </h1>
        <p class="hero-lead">
          SaaS-O-Matic es la herramienta interna con la que un comercial da de alta clientes corporativos con
          su identificador fiscal validado y simula su suscripción por tramos, con impuestos y en la divisa
          que elija.
        </p>
        <div class="actions">
          <a class="btn btn-primary" href="${DEMO_URL}">${icon('play')}Abrir la demo</a>
          <a class="btn btn-secondary" href="${REPO_URL}">${icon('code')}Ver el repositorio</a>
          <a class="btn-link" href="#producto">Empezar el recorrido${icon('arrow')}</a>
        </div>
        <p class="hero-note">
          La demo usa datos ficticios que se regeneran cada día. Para comprobar cada requisito con su test, la
          <a href="${githubUrl('GUIA-EVALUADOR.md')}">guía del evaluador</a>.
        </p>
      </div>
      ${renderProjection(data.example, data.vectorId)}
    </div>
    ${renderFigures(data)}`;
}
