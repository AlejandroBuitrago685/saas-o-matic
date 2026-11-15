// @ts-check
/**
 * How it was built (D-183): the cycle every part followed, and the timeline of the parts P0 to P13 (objective, pull
 * requests and one decision, all read from the plan and from decisiones.md) with the work that closed the delivery
 * after them. «Cómo se trabajó con la IA» (process.mjs) lays them out.
 */
import { AFTER_PLAN, HIGHLIGHTED_DECISIONS, PART_CYCLE } from '../content/timeline.mjs';
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
      <h4><span class="visually-hidden">${part.id}: </span>${part.title}</h4>
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

/**
 * @param {import('../content/timeline.mjs').AfterPlanWork} work
 * @param {TimelineData} data
 */
function renderAfterPlan(work, data) {
  const lead = data.decisionLeads.get(work.decision);
  if (lead === undefined) throw new Error(`renderAfterPlan: no decision ${work.decision}`);
  return markup`<li class="tl-part">
    <span class="tl-dot" aria-hidden="true"></span>
    <div class="tl-body">
      <h5>${work.title}</h5>
      <p>${work.what}</p>
      <p class="tl-meta">
        ${renderPullRequests(work.pullRequests)}<span class="tl-decision"
          ><a href="${githubUrl(DECISIONS_FILE)}">${work.decision}</a> ·
          ${inlineMarkdown(lead, DECISIONS_FILE)}</span
        >
      </p>
    </div>
  </li>`;
}

export function renderCycle() {
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

/**
 * The parts of the plan and the work after them, one entry each.
 * @param {TimelineData} data
 */
export function renderParts(data) {
  return markup`<ol class="timeline">
      ${data.parts.map((part) => renderPart(part, data))}
    </ol>
    <h4 class="sub-title">Después del plan: el cierre</h4>
    <ol class="timeline">
      ${AFTER_PLAN.map((work) => renderAfterPlan(work, data))}
    </ol>`;
}
