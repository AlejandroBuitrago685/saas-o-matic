// @ts-check
/**
 * How it was built (D-183): the timeline of the parts P0 to P13 (objective, pull requests and one decision, all read
 * from the plan and from decisiones.md) and the cycle every part followed.
 */
import { HIGHLIGHTED_DECISIONS, PART_CYCLE } from '../content/timeline.mjs';
import { markup } from '../html.mjs';
import { inlineMarkdown } from '../inline-markdown.mjs';
import { githubUrl, REPO_URL } from '../repo-links.mjs';
import { DECISIONS_FILE, PLAN_FILE } from '../sources/workflow.mjs';

/**
 * @typedef {object} TimelineData
 * @property {import('../sources/workflow.mjs').Part[]} parts
 * @property {Map<string, string[]>} pullRequests part → numbers of its pull requests
 * @property {Map<string, string>} decisionLeads decision id → its lead
 */

/** The objectives of the plan start in lower case (they follow «Objetivo:»); on their own they need a capital. */
const capitalized = (/** @type {string} */ text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * @param {readonly string[]} numbers
 */
function renderPullRequests(numbers) {
  if (numbers.length === 0) return markup`<span class="tl-pr">Esta parte</span>`;
  return markup`<span class="tl-pr"
    >${numbers.map(
      (number, index) =>
        markup`${index > 0 ? ', ' : ''}<a href="${REPO_URL}/pull/${number}">PR #${number}</a>`,
    )}</span
  >`;
}

/**
 * @param {import('../sources/workflow.mjs').Part} part
 * @param {TimelineData} data
 */
function renderPart(part, data) {
  const decision = HIGHLIGHTED_DECISIONS[part.id];
  const lead = decision === undefined ? undefined : data.decisionLeads.get(decision);
  if (decision === undefined || lead === undefined) throw new Error(`renderPart: no decision for ${part.id}`);
  return markup`<li class="tl-part">
    <span class="tl-id" aria-hidden="true">${part.id}</span>
    <div class="tl-body">
      <h3><span class="visually-hidden">${part.id}: </span>${part.title}</h3>
      <p>${inlineMarkdown(capitalized(part.objective), PLAN_FILE)}</p>
      <p class="tl-meta">
        ${renderPullRequests(data.pullRequests.get(part.id) ?? [])}<span class="tl-decision"
          ><a href="${githubUrl(DECISIONS_FILE)}">${decision}</a> ·
          ${inlineMarkdown(lead, DECISIONS_FILE)}</span
        >
      </p>
    </div>
  </li>`;
}

function renderCycle() {
  return markup`<ol class="cycle">
    ${PART_CYCLE.map(
      (step, index) =>
        markup`<li>
          <span class="cycle-index" aria-hidden="true">${index + 1}</span>
          <h4><a href="${githubUrl(step.source)}">${step.name}</a></h4>
          <p>${step.what}</p>
        </li>`,
    )}
  </ol>`;
}

/** @param {TimelineData} data */
export function renderTimeline(data) {
  return markup`<header class="section-head">
      <h2 id="construccion-titulo">Cómo se <span class="accent">construyó</span></h2>
      <p>
        Cuatro fases antes del código (análisis, especificación, arquitectura y plan) y después
        ${data.parts.length} partes, cada una en su sesión, su rama y su PR. Todas siguieron el mismo ciclo.
      </p>
    </header>
    <h3 class="sub-title">El ciclo de cada parte</h3>
    ${renderCycle()}
    <h3 class="sub-title">Las partes, de P0 a ${data.parts.at(-1)?.id ?? ''}</h3>
    <ol class="timeline">
      ${data.parts.map((part) => renderPart(part, data))}
    </ol>`;
}
