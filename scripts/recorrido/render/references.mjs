// @ts-check
/**
 * Links for the references the walkthrough cites (D-192): acceptance criteria, test vectors, requirements, security
 * requirements, decisions and ADR, each to the document that defines it.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from '../../lib/repo.mjs';
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';

const SPEC = 'ai-workspace/02-especificacion';
const ADR_DIR = 'ai-workspace/03-arquitectura/adr';

/** @type {readonly [RegExp, string][]} reference pattern → the document that defines it */
const DOCUMENTS = [
  [/^AC-\d+$/, `${SPEC}/07-criterios-aceptacion.md`],
  [/^TV-PR-\d+$/, `${SPEC}/02-reglas-negocio.md`],
  [/^RF-\d+$/, `${SPEC}/01-alcance.md`],
  [/^RNF-SEC-\d+$/, `${SPEC}/06-seguridad.md`],
  [/^D-\d+$/, 'ai-workspace/decisiones.md'],
];

/**
 * @param {string} id
 * @returns {string} the repository path of the document that defines the reference; throws for an unknown kind
 */
export function referencePath(id) {
  if (id.startsWith('ADR-')) {
    const file = readdirSync(join(REPO_ROOT, ADR_DIR)).find((name) => name.startsWith(`${id}-`));
    if (file === undefined) throw new Error(`referencePath: no ADR ${id}`);
    return `${ADR_DIR}/${file}`;
  }
  const match = DOCUMENTS.find(([pattern]) => pattern.test(id));
  if (match === undefined) throw new Error(`referencePath: unknown reference ${id}`);
  return match[1];
}

/** @param {readonly string[]} ids */
export function renderReferences(ids) {
  return markup`<ul class="sys-refs" aria-label="Criterios y decisiones">
    ${ids.map((id) => markup`<li><a href="${githubUrl(referencePath(id))}">${id}</a></li>`)}
  </ul>`;
}
