// @ts-check
/**
 * Requirements and evidence (D-183): the requirements table of GUIA-EVALUADOR.md, read from the file (D-181), with a
 * search box that the page script enables. On narrow screens each row becomes a card (CSS only).
 */
import { markup } from '../html.mjs';
import { inlineMarkdown, plainText } from '../inline-markdown.mjs';
import { githubUrl } from '../repo-links.mjs';
import { GUIDE_FILE } from '../sources/guide.mjs';

/**
 * @param {import('../sources/guide.mjs').RequirementRow} row
 * @returns {string} what the search box matches: the visible text and the paths of the linked tests, in lower case
 */
function searchText(row) {
  const visible = plainText(`${row.requirement} ${row.whereSeen} ${row.criteria} ${row.tests}`);
  const paths = [...row.tests.matchAll(/\]\(([^)]+)\)/g)].map(([, path]) => path);
  return [visible, ...paths].join(' ').toLowerCase();
}

/** @param {import('../sources/guide.mjs').RequirementRow} row */
function renderRow(row) {
  return markup`<tr data-search="${searchText(row)}">
    <th scope="row">${inlineMarkdown(row.requirement, GUIDE_FILE)}</th>
    <td data-label="Dónde se ve">${inlineMarkdown(row.whereSeen, GUIDE_FILE)}</td>
    <td data-label="Criterios">${inlineMarkdown(row.criteria, GUIDE_FILE)}</td>
    <td data-label="Tests">${inlineMarkdown(row.tests, GUIDE_FILE)}</td>
  </tr>`;
}

/** @param {number} count */
function renderSearch(count) {
  return markup`<div class="req-search" data-req-search hidden>
    <label for="buscar-requisito">Buscar un requisito, un criterio o un test</label>
    <input id="buscar-requisito" type="search" autocomplete="off" spellcheck="false" placeholder="Por ejemplo: divisa, AC-44 o simulator" />
    <p class="req-count" aria-live="polite" data-req-count>${count} requisitos</p>
  </div>`;
}

/** @param {readonly import('../sources/guide.mjs').RequirementRow[]} rows */
export function renderRequirements(rows) {
  return markup`<header class="section-head">
      <h2 id="requisitos-titulo">Requisitos y <span class="accent">evidencias</span></h2>
      <p>Cada requisito del enunciado, dónde se ve en la aplicación, qué criterios de aceptación lo concretan y qué test lo comprueba. Es la tabla de la <a href="${githubUrl(GUIDE_FILE)}">guía del evaluador</a>, leída del fichero al generar esta página.</p>
    </header>
    ${renderSearch(rows.length)}
    <div class="req-wrap">
      <table class="req-table">
        <caption class="visually-hidden">Requisitos del enunciado, dónde se ven, criterios y tests</caption>
        <thead><tr><th scope="col">Requisito del enunciado</th><th scope="col">Dónde se ve</th><th scope="col">Criterios</th><th scope="col">Tests</th></tr></thead>
        <tbody>${rows.map(renderRow)}</tbody>
      </table>
      <p class="req-empty" data-req-empty hidden>Ningún requisito coincide con la búsqueda.</p>
    </div>`;
}
