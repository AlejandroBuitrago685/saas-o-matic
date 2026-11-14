// @ts-check
/**
 * «Dónde intervine yo» (D-183, D-182): the ten moments of ai-workspace/README.md, with the same text and links, one
 * card each. They are read from the file, never rewritten here.
 */
import { markup } from '../html.mjs';
import { inlineMarkdown } from '../inline-markdown.mjs';
import { githubUrl } from '../repo-links.mjs';
import { WORKSPACE_README } from '../sources/workflow.mjs';

/**
 * The text of a moment and, on their own line, the links that close it («D-15 · prompt»): the same words, laid out
 * so a reference never sits alone at the end of a line.
 * @param {string} body
 */
function renderBody(body) {
  const split = /^(.*[.»)])\s+(\[[^\]]+\]\(.*)$/s.exec(body);
  if (split === null) return markup`<p>${inlineMarkdown(body, WORKSPACE_README)}</p>`;
  const [, text = '', references = ''] = split;
  return markup`<p>${inlineMarkdown(text, WORKSPACE_README)}</p>
    <p class="refs">${inlineMarkdown(references, WORKSPACE_README)}</p>`;
}

/** @param {readonly import('../sources/workflow.mjs').Moment[]} moments */
export function renderMoments(moments) {
  return markup`<header class="section-head">
      <h2 id="intervencion-titulo">Dónde <span class="accent">intervine yo</span></h2>
      <p>
        ${moments.length} momentos en los que mi criterio cambió el rumbo, en el orden en que ocurrieron. El
        texto es el de
        <a href="${githubUrl(`${WORKSPACE_README}#dónde-intervine-yo`)}">ai-workspace/README.md</a>; cada uno
        enlaza con su decisión y con el prompt en el que lo pedí.
      </p>
    </header>
    <ol class="moments">
      ${moments.map(
        (moment, index) =>
          markup`<li class="moment">
            <span class="moment-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
            <h3><span class="visually-hidden">${index + 1}. </span>${moment.title}</h3>
            ${renderBody(moment.body)}
          </li>`,
      )}
    </ol>`;
}
