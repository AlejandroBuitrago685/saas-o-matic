// @ts-check
/**
 * «Cómo está montado» (D-192): the system map by zones, like a whiteboard sketch, and its cards. Every piece is a
 * link to its card and every flow is a list of steps, all in the page: without script the cards are listed after
 * the map; with script (`esquema.js`) the lines are drawn, one card is shown at a time and a flow can be played.
 */
import { EDGES, ZONES } from '../content/architecture.mjs';
import { REQUEST_FLOWS } from '../content/request-flows.mjs';
import { markup, raw } from '../html.mjs';
import { icon } from './icons.mjs';
import { renderFlowCard, renderIntro, renderPieceCard, renderStepNav } from './architecture-cards.mjs';

/** @param {import('../content/architecture.mjs').Piece} piece */
function renderPiece(piece) {
  return markup`<a class="sys-piece" href="#pieza-${piece.id}" data-piece="${piece.id}"
    >${icon(piece.icon)}<span class="sys-piece-name">${piece.name}</span
    ><span class="sys-piece-caption">${piece.caption}</span></a
  >`;
}

/** @param {import('../content/architecture.mjs').Zone} zone */
function renderZone(zone) {
  return markup`<div class="sys-zone sys-zone-${zone.kind}" data-zone="${zone.id}">
    <span class="sys-zone-label">${zone.label}</span>
    ${zone.pieces.map(renderPiece)}
  </div>`;
}

/** @type {Readonly<Record<string, import('./icons.mjs').IconName>>} */
const FLOW_ICONS = { alta: 'idcard', simular: 'sliders', divisa: 'currency' };

function renderSwitcher() {
  return markup`<div class="sys-flows" role="group" aria-label="Recorridos por el sistema" data-sys-flows hidden>
    <button type="button" class="sys-flow-btn" data-flow="" aria-pressed="true">${icon('pointer')}Explorar</button>
    ${REQUEST_FLOWS.map(
      (flow) =>
        markup`<button type="button" class="sys-flow-btn" data-flow="${flow.id}" aria-pressed="false">
          ${icon(FLOW_ICONS[flow.id] ?? 'arrow')}${flow.name}
        </button>`,
    )}
  </div>`;
}

function renderLegend() {
  return markup`<ul class="sys-legend" aria-label="Leyenda del esquema">
    <li><span class="sys-legend-line" aria-hidden="true"></span>petición HTTP</li>
    <li><span class="sys-legend-line sys-legend-import" aria-hidden="true"></span>importa el código de otra pieza</li>
    <li><span class="sys-legend-zone" aria-hidden="true"></span>dónde se ejecuta</li>
  </ul>`;
}

/** The lines, for the page script: which pieces they join and whether they are a call or an import. */
function renderEdgeData() {
  const json = JSON.stringify(EDGES).replace(/</g, '\\u003c');
  return markup`<script type="application/json" id="esquema-lineas">${raw(json)}</script>`;
}

export function renderArchitecture() {
  return markup`<header class="section-head">
      <h2 id="arquitectura-titulo">Cómo está <span class="accent">montado</span></h2>
      <p>
        Dónde se ejecuta cada pieza y cómo se hablan. Pulsa una para ver qué hace, por qué es así, dónde está su
        código y qué test la comprueba, o sigue una petición de punta a punta con sus números reales.
      </p>
    </header>
    <div class="sys" data-system>
      ${renderSwitcher()}
      <div class="sys-body">
        <div class="sys-map" data-sys-map>
          <svg class="sys-wires" aria-hidden="true" focusable="false" data-sys-wires></svg>
          ${ZONES.map(renderZone)}
          <span class="sys-packet-label" data-sys-label hidden></span>
        </div>
        <div class="sys-cards" data-sys-cards>
          ${renderIntro()} ${ZONES.flatMap((zone) => zone.pieces.map((piece) => renderPieceCard(piece, zone)))}
          ${REQUEST_FLOWS.map(renderFlowCard)} ${renderStepNav()}
        </div>
      </div>
      ${renderLegend()} ${renderEdgeData()}
    </div>`;
}
