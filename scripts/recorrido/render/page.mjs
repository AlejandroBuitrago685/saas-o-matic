// @ts-check
/**
 * The shell of the walkthrough (D-183): head with the Content Security Policy, masthead, contents rail and footer.
 * The sections are rendered by their own modules and passed in already built.
 */
import { markup } from '../html.mjs';
import { DEMO_URL, githubUrl, REPO_URL } from '../repo-links.mjs';
import { icon } from './icons.mjs';

/**
 * GitHub Pages cannot send headers, so the policy travels in a `<meta>` (which cannot carry `frame-ancestors`).
 * Everything is served by the page itself: no CDN, no inline script or style, no tracker (D-183).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** @typedef {{ id: string, label: string, body: import('../html.mjs').SafeHtml }} Section */

/**
 * @param {readonly Section[]} sections
 * @param {import('../html.mjs').SafeHtml} generatedFrom the line of the footer that says where the data comes from
 * @returns {string} the whole document
 */
export function renderPage(sections, generatedFrom) {
  return markup`<!doctype html>
    <html lang="es">
      ${renderHead()}
      <body>
        <a class="skip-link" href="#contenido">Saltar al contenido</a>
        <header class="masthead">
          <div class="masthead-inner">
            <a class="brand" href="#portada"
              ><span class="brand-name">SaaS-<span>O-Matic</span></span
              ><small>Recorrido para evaluadores</small></a
            >
            <nav class="masthead-links" aria-label="Enlaces del proyecto">
              <a href="${DEMO_URL}">${icon('play')}<span>Demo</span></a>
              <a href="${REPO_URL}">${icon('code')}<span>Repositorio</span></a>
              <a href="${githubUrl('GUIA-EVALUADOR.md')}">${icon('file')}<span>Guía</span></a>
            </nav>
          </div>
        </header>
        <div class="layout">
          ${renderContents(sections)}
          <main id="contenido" tabindex="-1">
            ${sections.map(({ id, body }) => markup`<section id="${id}" class="section" aria-labelledby="${id}-titulo">${body}</section>`)}
          </main>
        </div>
        <footer class="footer">
          <p>${generatedFrom}</p>
          <p>
            Prueba técnica para Roams. Complementa a la
            <a href="${githubUrl('GUIA-EVALUADOR.md')}">guía del evaluador</a>; no la sustituye.
          </p>
        </footer>
      </body>
    </html> `.value;
}

function renderHead() {
  return markup`<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />
    <meta name="referrer" content="no-referrer" />
    <title>Recorrido de SaaS-O-Matic</title>
    <meta
      name="description"
      content="Qué hace SaaS-O-Matic, cómo está construido y cómo se ha trabajado con la IA, en un recorrido visual para quien evalúa la prueba técnica."
    />
    <link rel="stylesheet" href="tokens.css" />
    <link rel="stylesheet" href="recorrido.css" />
    <link rel="stylesheet" href="portada.css" />
    <link rel="stylesheet" href="secciones.css" />
    <script src="recorrido.js" defer></script>
  </head>`;
}

/**
 * The contents: a rail on wide screens (its thumb follows the reader, like the slider of the simulator) and a
 * disclosure on narrow ones. Both are plain links that work without script.
 * @param {readonly Section[]} sections
 */
function renderContents(sections) {
  const links = sections.map(
    ({ id, label }) =>
      markup`<li>
        <a href="#${id}" data-section="${id}"><span class="rail-dot" aria-hidden="true"></span>${label}</a>
      </li>`,
  );
  return markup`<nav class="contents" aria-label="Secciones del recorrido">
    <details class="contents-compact">
      <summary>Secciones</summary>
      <ol>
        ${links}
      </ol>
    </details>
    <ol class="rail">
      ${links}
    </ol>
  </nav>`;
}
