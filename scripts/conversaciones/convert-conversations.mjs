// @ts-check
/**
 * Converts the Claude Code sessions in which SaaS-O-Matic was built into readable Markdown (D-188), with the data of
 * the server covered (D-99, D-175, D-189). The sources are not in the repository; their paths are arguments:
 *
 *     node scripts/conversaciones/convert-conversations.mjs --privado <file outside the repo> \
 *       --salida ai-workspace/conversaciones --sesion <session.jsonl> [--sesion <session.jsonl> …] \
 *       [--listar-alertas <file outside the repo>] [--omisiones <rules>] [--sin-tapar]
 *
 * `--omisiones` defaults to `scripts/conversaciones/omissions.json`; the tests pass their own rules.
 * Nothing is written unless every check passes: no paragraph with an alert word left without a decision, no stale
 * rule in omissions.json, nothing left by the self-check and less than 15 MB in total. `--sin-tapar` writes the
 * conversations without covering anything, only outside the repository, to prove that the privacy test fails.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import { REPO_ROOT } from '../lib/repo.mjs';
import { readReviewed, REVIEWED_PATH, scanText } from '../privacy/check-deliverables.mjs';
import { OmissionLedger } from './omissions.mjs';
import { isInside, readPrivateFile } from './private-terms.mjs';
import { readSession } from './read-session.mjs';
import { leftovers, redact } from './redact.mjs';
import { renderConversation } from './render-markdown.mjs';

/**
 * @typedef {import('./render-markdown.mjs').SessionInfo} SessionInfo
 * @typedef {import('./private-terms.mjs').PrivateConfig} PrivateConfig
 * @typedef {import('./omissions.mjs').OmissionRules} OmissionRules
 * @typedef {{ salida: string, privado: string, sesion: string[], omisiones: string, listarAlertas?: string,
 *   sinTapar: boolean }} Options
 */

const MAX_BYTES = 15 * 1024 * 1024;
const HERE = join(REPO_ROOT, 'scripts', 'conversaciones');

/** @returns {Options} */
function options() {
  const { values } = parseArgs({
    options: {
      salida: { type: 'string' },
      privado: { type: 'string' },
      sesion: { type: 'string', multiple: true },
      'listar-alertas': { type: 'string' },
      omisiones: { type: 'string', default: join(HERE, 'omissions.json') },
      'sin-tapar': { type: 'boolean', default: false },
    },
  });
  const { salida, privado, sesion } = values;
  if (salida === undefined || privado === undefined || sesion === undefined) {
    throw new Error('Usage: --privado <file> --salida <dir> --sesion <file.jsonl> [--sesion …]');
  }
  const listing = values['listar-alertas'];
  return {
    salida,
    privado,
    sesion,
    omisiones: values.omisiones,
    sinTapar: values['sin-tapar'] === true,
    ...(listing ? { listarAlertas: listing } : {}),
  };
}

/**
 * @param {string} path
 * @returns {unknown}
 */
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * @param {string} path a session file
 * @param {{ manifest: SessionInfo[], ledger: OmissionLedger, config: PrivateConfig, covered: boolean }} context
 * @returns {{ file: string, markdown: string }}
 */
function convert(path, { manifest, ledger, config, covered }) {
  const session = readSession(path);
  const info = manifest.find((entry) => entry.id === session.id);
  if (info === undefined) throw new Error(`${path}: not in sessions.json`);
  const short = session.id.slice(0, 8);
  const blocks = session.blocks.map((block) => {
    if (!covered) return block;
    const kept = ledger.apply({ session: short, uuid: block.uuid, kind: block.kind, text: block.text });
    return { ...block, text: redact(kept, config.terms) };
  });
  const branches = covered
    ? session.branches.map((branch) => redact(branch, config.terms))
    : session.branches;
  return { file: info.file, markdown: renderConversation({ ...session, branches, info, blocks }) };
}

/**
 * @param {OmissionLedger} ledger
 * @returns {string} every paragraph with an alert, its decision and its text: raw data, for outside the repository
 */
function alertListing(ledger) {
  return ledger.alerts
    .map((entry) => {
      const head = `## ${entry.session} · ${entry.decision} · ${entry.words.join(', ')}`;
      return `${head}\n\n{ "session": "${entry.session}", "uuid": "${entry.uuid}", "hash": "${entry.hash}" }\n\n${entry.text}`;
    })
    .join('\n\n---\n\n');
}

/**
 * @param {{ opts: Options, ledger: OmissionLedger, outputs: { file: string, markdown: string }[],
 *   config: PrivateConfig }} run
 * @returns {string[]} why nothing can be written
 */
function problems({ opts, ledger, outputs, config }) {
  const found = [];
  const total = outputs.reduce((sum, { markdown }) => sum + Buffer.byteLength(markdown), 0);
  if (total > MAX_BYTES) found.push(`${String(total)} bytes: more than 15 MB`);
  if (opts.sinTapar) return found;
  found.push(
    ...ledger.undecided().map((entry) => `${entry.session} ${entry.hash}: alert without a decision`),
  );
  found.push(
    ...ledger.unused().map((rule) => `${rule.session}: rule of omissions.json that matched nothing`),
  );
  for (const { file, markdown } of outputs) {
    found.push(...leftovers(markdown, config.terms).map((what) => `${file}: ${what} left`));
  }
  return found;
}

/**
 * Every paragraph with an alert word in the conversations comes from a block that omissions.json decided safe, so the
 * converter records it in the registry of `scripts/privacy/` for the check of all the deliverables (D-189). Only for
 * an output inside the repository; the registry of the other files does not change.
 * @param {string} folder
 * @param {{ file: string, markdown: string }[]} outputs
 * @param {PrivateConfig} config
 */
function recordReviewed(folder, outputs, config) {
  if (!isInside(folder, REPO_ROOT)) return;
  const reviewed = readReviewed();
  for (const { file, markdown } of outputs) {
    const path = relative(REPO_ROOT, join(folder, file)).replace(/\\/g, '/');
    const { alerts } = scanText({ file: path, text: markdown, terms: config.terms, alerts: config.alerts });
    reviewed[path] = [...new Set(alerts.map((finding) => finding.hash))].sort();
  }
  const sorted = Object.fromEntries(Object.entries(reviewed).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(REVIEWED_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** @param {Options} opts the listing of alerts and the uncovered conversations hold raw text */
function assertRawOutsideRepo(opts) {
  for (const path of [opts.listarAlertas, opts.sinTapar ? opts.salida : undefined]) {
    if (path !== undefined && isInside(join(path, '..'), REPO_ROOT)) {
      throw new Error(`${path}: raw text never goes inside the repository (D-189)`);
    }
  }
}

function main() {
  const opts = options();
  const config = readPrivateFile(opts.privado, REPO_ROOT);
  assertRawOutsideRepo(opts);
  const ledger = new OmissionLedger(/** @type {OmissionRules} */ (readJson(opts.omisiones)), config.alerts);
  const manifest = /** @type {SessionInfo[]} */ (readJson(join(HERE, 'sessions.json')));
  const context = { manifest, ledger, config, covered: !opts.sinTapar };
  const outputs = opts.sesion.map((path) => convert(path, context));
  if (opts.listarAlertas !== undefined) writeFileSync(opts.listarAlertas, `${alertListing(ledger)}\n`);
  const found = problems({ opts, ledger, outputs, config });
  if (found.length > 0) {
    process.stderr.write(`Nothing written:\n${found.map((line) => `  - ${line}`).join('\n')}\n`);
    process.exit(1);
  }
  mkdirSync(opts.salida, { recursive: true });
  for (const { file, markdown } of outputs) writeFileSync(join(opts.salida, file), markdown);
  if (!opts.sinTapar) recordReviewed(opts.salida, outputs, config);
  const alerts = ledger.alerts.length;
  process.stdout.write(
    `${String(outputs.length)} conversations written; ${String(alerts)} paragraphs with alerts.\n`,
  );
}

main();
