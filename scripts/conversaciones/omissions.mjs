// @ts-check
/**
 * The omissions of D-175 that no pattern can find: whatever describes the private server of the demo. Every
 * paragraph with an alert word (from the private file) needs a decision in `omissions.json`, so none depends on a
 * reader noticing it (D-189). A paragraph is named by the UUID of its message and a hash of its text, which reveal
 * nothing:
 * - `omitido`: it is replaced by the only mark, which never says what it covers;
 * - `seguro`: it was read and can be published as it is.
 * Whole sections of a plan can be left out, named by the hash of their title.
 */
import { createHash } from 'node:crypto';

import { alertsIn } from './private-terms.mjs';
import { MARK } from './redact.mjs';

/** The marker of a list item (`- `, `* `, `1. `), kept when the item is omitted. */
const LIST_MARKER = /^\s*(?:[-*+]|\d+\.)\s+/;
/** Where a sentence ends inside a line: a full stop, a question or an exclamation mark, and a space. */
const SENTENCE_BREAK = /(?<=[.?!])\s+/;

/**
 * @typedef {{ session: string, uuid: string, hash: string, decision: 'omitido' | 'seguro' }} ParagraphRule
 * @typedef {{ session: string, hash: string }} SectionRule
 * @typedef {{ session: string, uuid: string, hash: string }} LineRule
 * @typedef {{ paragraphs: ParagraphRule[], sections: SectionRule[], lines?: LineRule[], sentences?: LineRule[] }} OmissionRules
 * @typedef {ParagraphRule | SectionRule | LineRule} AnyRule
 * @typedef {{ session: string, uuid: string, hash: string, words: string[], decision: string, text: string }} AlertEntry
 * @typedef {{ session: string, uuid: string, kind: string, text: string }} OmissionInput
 */

/**
 * @param {string} paragraph
 * @returns {string} the first 16 hex characters of the SHA-256 of the paragraph, with its spaces collapsed
 */
export function hashOf(paragraph) {
  return createHash('sha256').update(paragraph.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
}

/**
 * @param {string} text
 * @returns {string[]} its paragraphs, split at blank lines
 */
export function paragraphsOf(text) {
  return text.split(/\n[ \t]*\n/).filter((paragraph) => paragraph.trim() !== '');
}

/**
 * @param {string} line
 * @returns {{ level: number, title: string } | undefined}
 */
function headingOf(line) {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  return match === null ? undefined : { level: (match[1] ?? '').length, title: match[2] ?? '' };
}

/**
 * @param {string} plan the Markdown of a plan
 * @param {SectionRule} rule
 * @returns {string | undefined} the plan without the section whose title has the rule's hash (the title itself would
 * say what is omitted), from its heading to the next one of the same or a higher level; undefined when there is none
 */
export function withoutSection(plan, rule) {
  const lines = plan.split('\n');
  const start = lines.findIndex((line) => {
    const heading = headingOf(line);
    return heading !== undefined && hashOf(heading.title) === rule.hash;
  });
  if (start < 0) return undefined;
  const level = headingOf(lines[start] ?? '')?.level ?? 1;
  const rest = lines.slice(start + 1).findIndex((line) => (headingOf(line)?.level ?? 7) <= level);
  const end = rest < 0 ? lines.length : start + 1 + rest;
  return [...lines.slice(0, start), MARK, '', ...lines.slice(end)].join('\n');
}

/**
 * @param {string} line a line to omit
 * @returns {string} the mark, keeping the list marker of an item and the columns of a table row, so that the list or
 * the table around it still renders
 */
export function omittedLine(line) {
  if (line.trimStart().startsWith('|')) {
    const cells = line.trim().split('|').length - 2;
    return `| ${MARK} |${' |'.repeat(Math.max(0, cells - 1))}`;
  }
  return `${LIST_MARKER.exec(line)?.[0] ?? ''}${MARK}`;
}

/**
 * @param {string} paragraph
 * @returns {string} the paragraph with each run of omitted lines as a single one: how many there were says something
 */
export function collapseMarks(paragraph) {
  const isMark = (/** @type {string | undefined} */ line) =>
    line !== undefined &&
    line
      .replace(LIST_MARKER, '')
      .replace(/^\|\s*/, '')
      .replace(/\s*\|[\s|]*$/, '') === MARK;
  return paragraph
    .split('\n')
    .filter((line, index, lines) => !isMark(line) || !isMark(lines[index - 1]))
    .join('\n');
}

/** Applies the rules to every block of the conversations and keeps track of what each rule matched. */
export class OmissionLedger {
  /** @type {AlertEntry[]} */ alerts = [];
  /** @type {Set<AnyRule>} */ used = new Set();
  /** @type {Set<string>} */ sessions = new Set();

  /**
   * @param {OmissionRules} rules
   * @param {readonly string[]} alertWords
   */
  constructor(rules, alertWords) {
    this.rules = rules;
    this.alertWords = alertWords;
  }

  /**
   * @param {OmissionInput} block
   * @returns {string} its text with the omitted sections and paragraphs replaced
   */
  apply(block) {
    this.sessions.add(block.session);
    const lined = { ...block, text: this.withoutLines(block) };
    const text = block.kind === 'plan' ? this.withoutSections(lined) : lined.text;
    const paragraphs = paragraphsOf(text).map((paragraph) => collapseMarks(this.paragraph(block, paragraph)));
    return paragraphs
      .filter((paragraph, index) => paragraph !== MARK || paragraphs[index - 1] !== MARK)
      .join('\n\n');
  }

  /**
   * @param {OmissionInput} block
   * @returns {string} its text with the omitted lines replaced by the mark, keeping their list marker: for a list in
   * which only some items describe the server
   */
  withoutLines(block) {
    const ofBlock = (/** @type {LineRule} */ rule) =>
      rule.session === block.session && rule.uuid === block.uuid;
    const rules = (this.rules.lines ?? []).filter(ofBlock);
    const sentences = (this.rules.sentences ?? []).filter(ofBlock);
    if (rules.length === 0 && sentences.length === 0) return block.text;
    return block.text
      .split('\n')
      .map((line) => {
        const rule = rules.find((candidate) => candidate.hash === hashOf(line));
        if (rule === undefined) return this.withoutSentences(line, sentences);
        this.used.add(rule);
        return omittedLine(line);
      })
      .join('\n');
  }

  /**
   * @param {string} line
   * @param {LineRule[]} rules the sentences to omit, by the hash of their text
   * @returns {string} the line with those sentences replaced by the mark: for a line where only one sentence
   * describes the server
   */
  withoutSentences(line, rules) {
    if (rules.length === 0) return line;
    return line
      .split(SENTENCE_BREAK)
      .map((sentence) => {
        const rule = rules.find((candidate) => candidate.hash === hashOf(sentence));
        if (rule === undefined) return sentence;
        this.used.add(rule);
        return MARK;
      })
      .join(' ');
  }

  /**
   * @param {OmissionInput} block a plan
   * @returns {string}
   */
  withoutSections(block) {
    return this.rules.sections
      .filter((rule) => rule.session === block.session)
      .reduce((plan, rule) => {
        const cut = withoutSection(plan, rule);
        if (cut === undefined) return plan;
        this.used.add(rule);
        return cut;
      }, block.text);
  }

  /**
   * @param {OmissionInput} block
   * @param {string} paragraph
   * @returns {string}
   */
  paragraph(block, paragraph) {
    const hash = hashOf(paragraph);
    const rule = this.rules.paragraphs.find(
      (candidate) =>
        candidate.session === block.session && candidate.uuid === block.uuid && candidate.hash === hash,
    );
    // The mark says nothing, although it names the server: it needs no decision of its own.
    const words = alertsIn(paragraph.split(MARK).join(' '), this.alertWords);
    if (rule === undefined) {
      if (words.length > 0) this.log({ ...block, hash, words, decision: 'sin decidir', text: paragraph });
      return paragraph;
    }
    this.used.add(rule);
    this.log({ ...block, hash, words, decision: rule.decision, text: paragraph });
    return rule.decision === 'omitido' ? MARK : paragraph;
  }

  /** @param {AlertEntry & { kind?: string }} entry */
  log({ session, uuid, hash, words, decision, text }) {
    this.alerts.push({ session, uuid, hash, words, decision, text });
  }

  /** @returns {AlertEntry[]} the paragraphs with an alert word and no decision */
  undecided() {
    return this.alerts.filter((entry) => entry.decision === 'sin decidir');
  }

  /**
   * @returns {AnyRule[]} the rules of the sessions converted that matched nothing: stale entries
   * of omissions.json
   */
  unused() {
    return [
      ...this.rules.paragraphs,
      ...this.rules.sections,
      ...(this.rules.lines ?? []),
      ...(this.rules.sentences ?? []),
    ].filter((rule) => this.sessions.has(rule.session) && !this.used.has(rule));
  }
}
