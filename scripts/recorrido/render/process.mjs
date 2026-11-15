// @ts-check
/**
 * «Cómo se trabajó con la IA» (D-192): the cycle every part followed, the ten moments of «Dónde intervine yo» and,
 * folded, the parts of the plan and the delivery close. Ends with the documents where the whole process is written.
 */
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';
import { icon } from './icons.mjs';
import { renderMoments } from './people.mjs';
import { renderCycle, renderParts } from './timeline.mjs';

/** @type {readonly { path: string, name: string, what: string }[]} */
const DOCUMENTS = [
  { path: 'ai-workspace/README.md', name: 'ai-workspace', what: 'el mapa del proceso, por dónde empezar' },
  {
    path: 'ai-workspace/conversaciones/README.md',
    name: 'Conversaciones',
    what: 'las sesiones con la IA, enteras',
  },
  { path: 'ai-workspace/prompts', name: 'Prompts', what: 'lo que se pidió, literal' },
  {
    path: 'ai-workspace/decisiones.md',
    name: 'Decisiones',
    what: 'cada una con su alternativa y quién la tomó',
  },
  { path: 'ai-workspace/diario.md', name: 'Diario', what: 'qué falló y qué corrigió el revisor' },
];

function renderDocuments() {
  return markup`<ul class="process-docs">
    ${DOCUMENTS.map(
      (document) =>
        markup`<li>
          <a href="${githubUrl(document.path)}">${icon(document.path.endsWith('.md') ? 'file' : 'folder')}<span
              ><strong>${document.name}</strong>${document.what}</span
            ></a
          >
        </li>`,
    )}
  </ul>`;
}

/**
 * @param {{
 *   timeline: import('./timeline.mjs').TimelineData,
 *   moments: readonly import('../sources/workflow.mjs').Moment[],
 * }} data
 */
export function renderProcess(data) {
  const parts = data.timeline.parts;
  return markup`<header class="section-head">
      <h2 id="proceso-titulo">Cómo se trabajó <span class="accent">con la IA</span></h2>
      <p>
        Cuatro fases antes del código (análisis, especificación, arquitectura y plan) y después
        ${parts.length} partes, cada una en su sesión, su rama y su PR, con el mismo ciclo.
      </p>
    </header>
    <h3 class="sub-title">El ciclo de cada parte</h3>
    ${renderCycle()}
    <h3 class="sub-title">Dónde intervine yo</h3>
    <p class="process-lead">
      ${data.moments.length} momentos en los que mi criterio cambió el rumbo, con el texto de
      <a href="${githubUrl('ai-workspace/README.md#dónde-intervine-yo')}">ai-workspace/README.md</a>.
    </p>
    ${renderMoments(data.moments)}
    <details class="process-parts">
      <summary>
        <h3>Las ${parts.length} partes, de P0 a ${parts.at(-1)?.id ?? ''}, y el cierre</h3>
      </summary>
      ${renderParts(data.timeline)}
    </details>
    <h3 class="sub-title">Para ir a fondo</h3>
    ${renderDocuments()}`;
}
