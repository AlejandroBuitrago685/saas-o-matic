// @ts-check
/**
 * Reads a Claude Code session (`.jsonl`) and keeps only what a reader of the conversation needs (D-188): the messages
 * of the user and the text of Claude in full, one line per tool call, the plans presented and the answers given to
 * them, and the first paragraph of each subagent's report. Thinking, system reminders, attachments, tool output,
 * background-task notifications and the summaries of a compaction are left out.
 */
import { readFileSync } from 'node:fs';

import { agentReportSummary, toolLines, userReplyOf } from './tool-calls.mjs';

/**
 * @typedef {'user' | 'claude'} Author
 * @typedef {'text' | 'tool' | 'plan' | 'agent' | 'note'} BlockKind
 * @typedef {{ author: Author, kind: BlockKind, text: string }} Entry
 * @typedef {Entry & { uuid: string, time: string }} Block
 * @typedef {{ id: string, models: string[], branches: string[], first: string, last: string, blocks: Block[] }} Session
 * @typedef {{ type?: string, text?: string, name?: string, id?: string, input?: Record<string, unknown>,
 *   tool_use_id?: string, content?: unknown }} ContentBlock
 * @typedef {{ type?: string, uuid?: string, timestamp?: string, isSidechain?: boolean, isMeta?: boolean,
 *   isCompactSummary?: boolean, gitBranch?: string, sessionId?: string, turnOrigin?: string,
 *   attachment?: { type?: string, prompt?: unknown, origin?: { kind?: string, name?: string, body?: string } },
 *   origin?: { kind?: string, name?: string, body?: string },
 *   message?: { model?: string, content?: string | ContentBlock[] } }} RawRecord
 */

const COMPACTED = '[El contexto se compactó aquí: la sesión siguió con un resumen automático de lo anterior]';
const SYNTHETIC = '[La respuesta se interrumpió por un error de la API]';
const HOST_RESUMED =
  '*(Mensaje automático de la app: se había alcanzado el límite de uso y la sesión continúa)*';

/**
 * @param {string} text a message of the user as stored, with the wrappers of the desktop app
 * @returns {string} what the user wrote
 */
export function cleanUserText(text) {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<\/?pasted_content[^>]*>/g, '')
    .trim();
}

/**
 * @param {unknown} content the content of a tool result
 * @returns {string}
 */
export function resultText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('\n');
}

/**
 * @param {string | ContentBlock[] | undefined} content
 * @returns {string} the text blocks of a message, joined
 */
function textOf(content) {
  if (typeof content === 'string') return content;
  return blocksOf(content)
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n\n');
}

/**
 * @param {string | ContentBlock[] | undefined} content
 * @returns {ContentBlock[]}
 */
function blocksOf(content) {
  return Array.isArray(content) ? content : [];
}

/**
 * @param {RawRecord} record
 * @returns {boolean} whether the record is a message of the main conversation
 */
function isMainMessage(record) {
  const isMessage = record.type === 'user' || record.type === 'assistant' || queuedKind(record) !== undefined;
  return isMessage && record.isSidechain !== true && record.uuid !== undefined;
}

/**
 * @param {RawRecord} record
 * @returns {'human' | 'peer' | undefined} who sent a message that arrived while Claude was working (the app queues
 * it): the user, or a subagent handing back its report
 */
function queuedKind(record) {
  const attachment = record.attachment;
  if (record.type !== 'attachment' || attachment?.type !== 'queued_command') return undefined;
  const kind = attachment.origin?.kind;
  return kind === 'human' || kind === 'peer' ? kind : undefined;
}

/**
 * @param {RawRecord} record a message the user typed
 * @returns {Entry}
 */
function humanEntry(record) {
  return { author: 'user', kind: 'text', text: cleanUserText(textOf(record.message?.content)) };
}

/**
 * @param {RawRecord} record a message that arrived while Claude was working
 * @returns {Entry}
 */
function queuedEntry(record) {
  const attachment = record.attachment ?? {};
  if (queuedKind(record) === 'peer') {
    return { author: 'claude', kind: 'agent', text: agentReportSummary(attachment.origin ?? {}) };
  }
  const prompt = attachment.prompt;
  return { author: 'user', kind: 'text', text: cleanUserText(typeof prompt === 'string' ? prompt : '') };
}

/** Collects the blocks of one session, in file order, without the records it already saw. */
class SessionReader {
  /** @type {Block[]} */ blocks = [];
  /** @type {Set<string>} */ models = new Set();
  /** @type {Set<string>} */ branches = new Set();
  /** @type {Set<string>} */ seen = new Set();
  /** @type {Set<string>} */ reports = new Set();
  /** @type {Map<string, { name: string, input: Record<string, unknown> }>} */ calls = new Map();
  first = '';
  last = '';

  /**
   * @param {Entry} entry
   * @param {RawRecord} record
   */
  add(entry, record) {
    if (entry.text.trim() === '') return;
    // A report can arrive twice: as a message of its own and queued while Claude was working.
    if (entry.kind === 'agent' && this.reports.has(entry.text)) return;
    if (entry.kind === 'agent') this.reports.add(entry.text);
    this.blocks.push({ ...entry, uuid: record.uuid ?? '', time: record.timestamp ?? this.last });
  }

  /** @param {RawRecord} record */
  read(record) {
    const uuid = record.uuid ?? '';
    if (!isMainMessage(record) || this.seen.has(uuid)) return;
    this.seen.add(uuid);
    this.track(record);
    if (record.type === 'assistant') this.readAssistant(record);
    else if (record.type === 'attachment') this.add(queuedEntry(record), record);
    else this.readUser(record);
  }

  /** @param {RawRecord} record */
  track(record) {
    const time = record.timestamp ?? this.last;
    if (this.first === '') this.first = time;
    this.last = time;
    const branch = record.gitBranch ?? 'HEAD';
    if (branch !== 'HEAD') this.branches.add(branch);
  }

  /** @param {RawRecord} record */
  readAssistant(record) {
    const message = record.message ?? {};
    const model = message.model ?? '';
    if (model === '<synthetic>') return this.add({ author: 'claude', kind: 'note', text: SYNTHETIC }, record);
    if (model !== '') this.models.add(model);
    for (const block of blocksOf(message.content)) this.readAssistantBlock(block, record);
  }

  /**
   * @param {ContentBlock} block
   * @param {RawRecord} record
   */
  readAssistantBlock(block, record) {
    if (block.type === 'text') this.add({ author: 'claude', kind: 'text', text: block.text ?? '' }, record);
    if (block.type === 'tool_use') this.readToolUse(block, record);
  }

  /**
   * @param {ContentBlock} block
   * @param {RawRecord} record
   */
  readToolUse(block, record) {
    const name = block.name ?? '';
    const input = block.input ?? {};
    this.calls.set(block.id ?? '', { name, input });
    const plan = input['plan'];
    if (name === 'ExitPlanMode' && typeof plan === 'string') {
      return this.add({ author: 'claude', kind: 'plan', text: plan }, record);
    }
    for (const text of toolLines(name, input)) this.add({ author: 'claude', kind: 'tool', text }, record);
  }

  /** @param {RawRecord} record */
  readUser(record) {
    const origin = record.origin ?? {};
    if (record.isCompactSummary === true)
      return this.add({ author: 'claude', kind: 'note', text: COMPACTED }, record);
    if (origin.kind === 'human') return this.add(humanEntry(record), record);
    if (origin.kind === 'peer') {
      return this.add({ author: 'claude', kind: 'agent', text: agentReportSummary(origin) }, record);
    }
    if (record.turnOrigin === 'host_synthetic')
      return this.add({ author: 'user', kind: 'note', text: HOST_RESUMED }, record);
    if (origin.kind === undefined && record.isMeta !== true) this.readToolResults(record);
  }

  /** @param {RawRecord} record */
  readToolResults(record) {
    for (const block of blocksOf(record.message?.content)) {
      const call = block.type === 'tool_result' ? this.calls.get(block.tool_use_id ?? '') : undefined;
      const reply = call === undefined ? undefined : userReplyOf(call, resultText(block.content));
      if (reply !== undefined) this.add(reply, record);
    }
  }
}

/**
 * @param {string} jsonl the content of a session file
 * @returns {Session}
 */
export function parseSession(jsonl) {
  const reader = new SessionReader();
  let id = '';
  for (const line of jsonl.split('\n')) {
    if (line.trim() === '') continue;
    /** @type {RawRecord} */
    const record = JSON.parse(line);
    if (id === '' && typeof record.sessionId === 'string') id = record.sessionId;
    reader.read(record);
  }
  const { models, branches, first, last, blocks } = reader;
  return { id, models: [...models], branches: [...branches], first, last, blocks };
}

/**
 * @param {string} path
 * @returns {Session}
 */
export function readSession(path) {
  return parseSession(readFileSync(path, 'utf8'));
}
