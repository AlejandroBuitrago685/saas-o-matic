// @ts-check
/**
 * How a request travels (D-183): the pieces in a row on wide screens and in a column on narrow ones, never shrunk.
 * Each piece is a link to its panel: without script every panel is listed below the diagram; with script only the
 * chosen one is shown.
 */
import { RATES_CALL, REQUEST_PATH } from '../content/architecture.mjs';
import { markup } from '../html.mjs';
import { icon } from './icons.mjs';
import { renderPaths } from './paths.mjs';

/** @param {import('../content/architecture.mjs').Piece} piece */
function renderNode(piece) {
  return markup`<a class="arch-node" href="#${piece.id}" data-piece="${piece.id}"
    ><span class="arch-name">${piece.name}</span><span class="arch-role">${piece.role}</span></a
  >`;
}

/** @param {import('../content/architecture.mjs').Piece} piece */
function renderPanel(piece) {
  return markup`<article id="${piece.id}" class="arch-panel" aria-labelledby="${piece.id}-titulo" tabindex="-1">
    <h3 id="${piece.id}-titulo">${piece.name} <span>${piece.role}</span></h3>
    <div class="arch-panel-body">
      <div class="arch-text">
        <p>${piece.does}</p>
        <p class="arch-control">
          ${icon('shield')}<span
            ><strong>Control de seguridad.</strong> ${piece.control}
            <span class="refs">${piece.controlIds.join(' · ')}</span></span
          >
        </p>
      </div>
      ${renderPaths(piece.files, 'file', 'Dónde está')}
    </div>
  </article>`;
}

export function renderArchitecture() {
  const pieces = [...REQUEST_PATH, RATES_CALL];
  return markup`<header class="section-head">
      <h2 id="arquitectura-titulo">Cómo viaja <span class="accent">una petición</span></h2>
      <p>
        Del navegador a la base de datos, y la única llamada que sale fuera: los tipos de cambio, que pide el
        propio navegador. Pulsa una pieza para ver qué hace, qué control de seguridad aplica y en qué fichero
        está.
      </p>
    </header>
    <nav class="arch" aria-label="Piezas de la arquitectura">
      <ol class="arch-path">
        ${REQUEST_PATH.map((piece) => markup`<li>${renderNode(piece)}</li>`)}
      </ol>
      <div class="arch-branch">
        <span class="arch-branch-label">El navegador pide los tipos de cambio</span>
        ${renderNode(RATES_CALL)}
      </div>
    </nav>
    <div class="arch-panels">${pieces.map(renderPanel)}</div>`;
}
