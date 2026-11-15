// @ts-check
/**
 * Builds every versioned file of the evaluator walkthrough in memory (D-183): `npm run recorrido` writes them and
 * `tools/recorrido.test.ts` compares them with the committed ones, so the page can never lag behind the repository.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from '../lib/repo.mjs';
import { loadData } from './data.mjs';
import { markup } from './html.mjs';
import { renderArchitecture } from './render/architecture.mjs';
import { renderFlow } from './render/flow.mjs';
import { renderHero } from './render/hero.mjs';
import { CONTENT_SECURITY_POLICY, renderPage } from './render/page.mjs';
import { renderProcess } from './render/process.mjs';
import { renderRequirements } from './render/requirements.mjs';
import { FONT_DIR, FONT_FILE, TOKENS_FILE, tokenStylesheet } from './sources/assets.mjs';

export const SITE_DIR = 'docs/recorrido';

/** @returns {Promise<string>} the walkthrough page */
async function renderWalkthrough() {
  const data = await loadData();
  const sections = [
    { id: 'portada', label: 'Portada', body: renderHero(data.hero) },
    { id: 'arquitectura', label: 'Cómo está montado', body: renderArchitecture() },
    { id: 'producto', label: 'El producto', body: renderFlow(data.flow) },
    { id: 'proceso', label: 'Cómo se trabajó', body: renderProcess(data) },
    { id: 'requisitos', label: 'Requisitos', body: renderRequirements(data.requirements) },
  ];
  const footer = markup`Cada cifra y cada tabla de esta página salen del repositorio con <code>npm run recorrido</code>.`;
  return renderPage(sections, footer);
}

/** @returns {string} the root of the published site: it only points to the walkthrough (no 404 at the root) */
function renderRootPage() {
  return markup`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="refresh" content="0; url=recorrido/" />
    <title>SaaS-O-Matic</title>
  </head>
  <body>
    <p><a href="recorrido/">Ir al recorrido visual de SaaS-O-Matic</a></p>
  </body>
</html>
`.value;
}

/** @returns {Promise<Map<string, string | Buffer>>} repository-relative path → content of every generated file */
export async function buildSite() {
  const font = (/** @type {string} */ file) => readFileSync(join(REPO_ROOT, FONT_DIR, file));
  return new Map(
    /** @type {[string, string | Buffer][]} */ ([
      [`${SITE_DIR}/index.html`, await renderWalkthrough()],
      [`${SITE_DIR}/tokens.css`, tokenStylesheet(readFileSync(join(REPO_ROOT, TOKENS_FILE), 'utf8'))],
      [`${SITE_DIR}/fuentes/montserrat-latin-wght-normal.woff2`, font(FONT_FILE)],
      [`${SITE_DIR}/fuentes/LICENSE`, font('LICENSE')],
      ['docs/index.html', renderRootPage()],
    ]),
  );
}
