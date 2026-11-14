// @ts-check
/**
 * `npm run recorrido` (D-183, D-184): writes the evaluator walkthrough of `docs/recorrido` from the repository, and
 * copies next to it the compiled domain package that its tier simulator imports. That copy is a build output
 * (ignored by git): GitHub Pages runs this same command before publishing.
 * Usage: node scripts/recorrido/generate-recorrido.mjs   (after `npm run build:packages`)
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from '../lib/repo.mjs';
import { buildSite, SITE_DIR } from './site.mjs';

export const DOMAIN_DIST = 'packages/domain/dist';
export const DOMAIN_COPY = `${SITE_DIR}/domain`;
/** `from './x.js'`, `import './x.js'` and `import('./x.js')`, with single or double quotes. */
const RELATIVE_IMPORT = /\b(?:from|import)\s*\(?\s*(['"])(\.{1,2}\/[^'"]+\.js)\1/g;

/**
 * @param {(path: string) => string} readModule reads a module of the compiled package by its relative path
 * @param {string} entry
 * @returns {Map<string, string>} every module reachable from `entry` through relative imports, by relative path: the
 * declarations, source maps and test fixtures of `dist` are left out
 */
export function reachableModules(readModule, entry = 'index.js') {
  /** @type {Map<string, string>} */
  const modules = new Map();
  const pending = [entry];
  for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
    if (modules.has(path)) continue;
    const source = readModule(path).replace(/\n\/\/# sourceMappingURL=.*$/m, '');
    modules.set(path, source);
    for (const [, , target = ''] of source.matchAll(RELATIVE_IMPORT)) {
      const next = posix.normalize(posix.join(posix.dirname(path), target));
      if (next.startsWith('..'))
        throw new Error(`reachableModules: ${path} imports ${target}, outside the package`);
      pending.push(next);
    }
  }
  return modules;
}

/** @param {string} path @param {string | Buffer} content */
function write(path, content) {
  const absolute = join(REPO_ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

async function main() {
  for (const [path, content] of await buildSite()) write(path, content);
  rmSync(join(REPO_ROOT, DOMAIN_COPY), { recursive: true, force: true });
  const modules = reachableModules((path) => readFileSync(join(REPO_ROOT, DOMAIN_DIST, path), 'utf8'));
  for (const [path, source] of modules) write(`${DOMAIN_COPY}/${path}`, source);
  process.stdout.write(`recorrido: ${SITE_DIR} written, ${String(modules.size)} domain modules copied\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
