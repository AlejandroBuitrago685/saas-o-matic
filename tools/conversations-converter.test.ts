import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collapseMarks,
  hashOf,
  OmissionLedger,
  omittedLine,
  withoutSection,
} from '../scripts/conversaciones/omissions.mjs';
import { alertsIn, isInside, parsePrivateFile } from '../scripts/conversaciones/private-terms.mjs';
import { parseSession } from '../scripts/conversaciones/read-session.mjs';
import { leftovers, MARK, redact } from '../scripts/conversaciones/redact.mjs';
import { renderConversation, sanitize } from '../scripts/conversaciones/render-markdown.mjs';
import {
  answersOf,
  summaryOf,
  toolLine,
  toolLines,
  userReplyOf,
} from '../scripts/conversaciones/tool-calls.mjs';
import {
  FORBIDDEN_PHRASES,
  forbiddenPhrasesIn,
  isDeliverable,
  reviewedFrom,
  scanText,
} from '../scripts/privacy/check-deliverables.mjs';
import { REPO_ROOT } from './lint-fixture.js';

const SESSION_ID = '45aec011-6969-4e0c-a6c3-b426805f5f95';
const CLI = join(REPO_ROOT, 'scripts', 'conversaciones', 'convert-conversations.mjs');
let counter = 0;

/** One record of a session file, with the fields every record has. */
function record(fields: Record<string, unknown>): string {
  counter += 1;
  const base = { uuid: `u-${String(counter)}`, timestamp: '2026-11-13T18:10:00.000Z', sessionId: SESSION_ID };
  return JSON.stringify({ ...base, ...fields });
}

const human = (text: string): string =>
  record({ type: 'user', origin: { kind: 'human' }, message: { content: text } });
const assistant = (content: unknown[]): string =>
  record({ type: 'assistant', message: { model: 'claude-opus-5-5', content } });
const toolResult = (id: string, content: string): string =>
  record({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } });
const report = (verdict: string): string =>
  `Frame. The report follows:\n  ## Revisión\n  \n  ${verdict}\n  \n  ## Hallazgos`;

const SESSION = [
  human('<pasted_content id="1">Estoy en modo plan: preséntame el plan.</pasted_content>'),
  assistant([
    { type: 'thinking', thinking: 'internal reasoning that must not appear' },
    { type: 'text', text: 'Leo el plan.' },
    {
      type: 'tool_use',
      id: 't1',
      name: 'Bash',
      input: { command: 'npm test', description: 'Run the tests' },
    },
  ]),
  toolResult('t1', 'output of the tests that must not appear'),
  assistant([{ type: 'tool_use', id: 't2', name: 'ExitPlanMode', input: { plan: '# Plan\n\nPaso 1.' } }]),
  toolResult(
    't2',
    "The user doesn't want to proceed with this tool use. To tell you how to proceed, the user said:\nCorrige el paso 1.",
  ),
  record({
    type: 'attachment',
    attachment: { type: 'queued_command', prompt: 'Un mensaje en cola.', origin: { kind: 'human' } },
  }),
  record({
    type: 'user',
    origin: { kind: 'peer', name: 'revisor', body: report('**Veredicto: APTO.** Sin P0.') },
  }),
  record({
    type: 'attachment',
    attachment: {
      type: 'queued_command',
      origin: { kind: 'peer', name: 'revisor', body: report('**Veredicto: APTO.** Sin P0.') },
    },
  }),
  record({
    type: 'user',
    isSidechain: true,
    origin: { kind: 'human' },
    message: { content: 'a subagent turn' },
  }),
  record({ type: 'user', isCompactSummary: true, message: { content: 'summary of the session' } }),
];

describe('D-188 reading a Claude Code session', () => {
  const blocks = parseSession(SESSION.join('\n')).blocks;
  const texts = blocks.map((block) => `${block.author}/${block.kind}: ${block.text}`);

  it('keeps the messages in full and one line per tool, without thinking, tool output nor subagent turns', () => {
    expect(texts.slice(0, 3)).toEqual([
      'user/text: Estoy en modo plan: preséntame el plan.',
      'claude/text: Leo el plan.',
      'claude/tool: `Bash` · Run the tests',
    ]);
    expect(texts.join('\n')).not.toMatch(
      /internal reasoning|output of the tests|a subagent turn|summary of the session/,
    );
  });

  it('keeps the plan, the reply to it, the queued message and the verdict of the reviewer, once', () => {
    expect(texts.slice(3)).toEqual([
      'claude/plan: # Plan\n\nPaso 1.',
      'user/text: Corrige el paso 1.',
      'user/text: Un mensaje en cola.',
      'claude/agent: Resultado del subagente `revisor`: **Veredicto: APTO.** Sin P0.',
      expect.stringContaining('claude/note: [El contexto se compactó aquí'),
    ]);
  });

  it('reads each record once, even when a later file repeats it', () => {
    expect(parseSession([...SESSION, ...SESSION].join('\n')).blocks).toHaveLength(blocks.length);
  });
});

describe('D-188 tool calls and their answers', () => {
  it('writes a tool as its name and description, with paths relative to the repository', () => {
    const path = 'C:\\Users\\Usuario\\Desktop\\Proyectos\\Web\\saas-o-matic\\apps\\api\\src\\main.ts';

    expect(toolLine('Read', { file_path: path })).toBe('`Read` · `apps/api/src/main.ts`');
    expect(toolLine('mcp__ccd_turn__update_plan', { items: [] })).toBe('`update_plan`');
  });

  it('writes one line per question of AskUserQuestion, and one paragraph per answer', () => {
    const result =
      'Your questions have been answered: "¿A o B?"="A (Recomendado)", "¿Sí?"="No". You can now continue.';

    expect(
      toolLines('AskUserQuestion', { questions: [{ question: '¿A o B?' }, { question: '¿Sí?' }] }),
    ).toEqual(['`AskUserQuestion` · ¿A o B?', '`AskUserQuestion` · ¿Sí?']);
    expect(answersOf(['¿A o B?', '¿Sí?'], result)).toBe('- **¿A o B?** → A (Recomendado)\n\n- **¿Sí?** → No');
  });

  it('keeps the reply to a plan that older versions of the app stored as the whole result', () => {
    const call = { name: 'ExitPlanMode', input: {} };

    expect(userReplyOf(call, 'Buen plan. Tres ajustes.')).toEqual({
      author: 'user',
      kind: 'text',
      text: 'Buen plan. Tres ajustes.',
    });
    expect(userReplyOf(call, 'User has approved your plan.')?.text).toBe('*(Aprueba el plan)*');
  });

  it('sums up a report by its verdict, also when it is a heading, or else by its first paragraph', () => {
    expect(summaryOf('## Título\n\nTexto.\n\n**Veredicto: NO APTO.** 1 P0.')).toBe(
      '**Veredicto: NO APTO.** 1 P0.',
    );
    expect(summaryOf('[harness: a note]\n\n## Veredicto: **NO APTO** (1 P0)\n\nTexto.')).toBe(
      'Veredicto: **NO APTO** (1 P0)',
    );
    expect(summaryOf('## Título\n\nPrimer párrafo.\n\nSegundo.')).toBe('Primer párrafo.');
  });
});

describe('D-189 covering the data of the server, always with the same mark', () => {
  const terms = ['alias-x'];

  it('covers addresses, other hosts, server paths, emails, tokens and private terms, and shortens the Windows home', () => {
    const text = [
      'ip 10.1.2.3 and fe80::1:2, host otro.codeservice.es, path /etc/nginx/x.conf, mail a@b.es',
      'token ghp_abcdefghijklmnopqrstuvwxyz12, ssh alias-x, file C:\\Users\\Usuario\\Downloads\\x.docx',
    ].join('\n');

    expect(redact(text, terms)).toBe(
      [
        `ip ${MARK} and ${MARK}, host ${MARK}, path ${MARK}, mail ${MARK}`,
        `token ${MARK}, ssh ${MARK}, file ~\\Downloads\\x.docx`,
      ].join('\n'),
    );
  });

  it('keeps loopback, documentation addresses, the Docker subnet, noreply, the demo and package versions', () => {
    const text =
      '127.0.0.1:4010 ::1 203.0.113.7 172.30.0.10 2001:db8::1 x@users.noreply.github.com saas-o-matic.codeserviceapi.es pkg@1.2.3 ::after';

    expect(redact(text, terms)).toBe(text);
    expect(leftovers(text, terms)).toEqual([]);
  });

  it('reports in the self-check what is still there', () => {
    expect(leftovers('10.1.2.3 and alias-x', terms)).toEqual(['IP', 'término privado']);
  });
});

describe('D-189 the private file and the alerts', () => {
  it('reads the terms to cover and the alert words, and rejects a line outside its sections', () => {
    expect(parsePrivateFile('# comment\n[tapar]\nalias-x\tthe alias\n[alerta]\nUFW\ncortafuegos\n')).toEqual({
      terms: ['alias-x'],
      alerts: ['UFW', 'cortafuegos'],
    });
    expect(() => parsePrivateFile('loose line')).toThrow(/outside/);
  });

  it('matches a short alert as a whole word and a long one as the start of a word', () => {
    expect(alertsIn('el CPU y los cortafuegos', ['CPU', 'cortafuegos', 'RAM'])).toEqual([
      'CPU',
      'cortafuegos',
    ]);
    expect(alertsIn('PROGRAMA y descortafuegos', ['RAM', 'cortafuegos'])).toEqual([]);
  });

  it('knows whether a path is inside the repository', () => {
    expect(isInside(join(REPO_ROOT, 'package.json'), REPO_ROOT)).toBe(true);
    expect(isInside(tmpdir(), REPO_ROOT)).toBe(false);
    expect(isInside(join(REPO_ROOT, '..foo'), REPO_ROOT)).toBe(true);
    expect(isInside(join(REPO_ROOT, 'no-such-folder', 'out'), REPO_ROOT)).toBe(true);
    expect(isInside(join(REPO_ROOT, '..', 'outside', 'out'), REPO_ROOT)).toBe(false);
  });
});

describe('D-189 the omissions of D-175', () => {
  const block = {
    session: '45aec011',
    uuid: 'u-1',
    kind: 'text',
    text: 'Primero.\n\nEl UFW del servidor.\n\nTercero.',
  };
  const rule = {
    session: '45aec011',
    uuid: 'u-1',
    hash: hashOf('El UFW  del\nservidor.'),
    decision: 'omitido' as const,
  };

  it('replaces an omitted paragraph with the mark, named by the hash of its text', () => {
    const ledger = new OmissionLedger({ paragraphs: [rule], sections: [] }, ['UFW']);

    expect(ledger.apply(block)).toBe(`Primero.\n\n${MARK}\n\nTercero.`);
    expect(ledger.undecided()).toEqual([]);
    expect(ledger.unused()).toEqual([]);
  });

  it('replaces only the omitted item of a list, keeping its marker', () => {
    const list = { ...block, text: '- uno\n- el UFW\n- tres' };
    const ledger = new OmissionLedger(
      {
        paragraphs: [],
        sections: [],
        lines: [{ session: '45aec011', uuid: 'u-1', hash: hashOf('- el UFW') }],
      },
      ['UFW'],
    );

    expect(ledger.apply(list)).toBe(`- uno\n- ${MARK}\n- tres`);
    expect(ledger.undecided()).toEqual([]);
  });

  it('replaces only the omitted sentence of a line', () => {
    const line = { ...block, text: '- Uno. El UFW del servidor. Tres.' };
    const sentences = [{ session: '45aec011', uuid: 'u-1', hash: hashOf('El UFW del servidor.') }];
    const ledger = new OmissionLedger({ paragraphs: [], sections: [], sentences }, ['UFW']);

    expect(ledger.apply(line)).toBe(`- Uno. ${MARK} Tres.`);
    expect(ledger.unused()).toEqual([]);
  });

  it('reports a paragraph with an alert and no decision, and a rule of a converted session that matched nothing', () => {
    const stale = { ...rule, uuid: 'u-9', decision: 'seguro' as const };
    const other = { ...rule, session: 'otra0000' };
    const ledger = new OmissionLedger({ paragraphs: [stale, other], sections: [] }, ['UFW']);
    ledger.apply(block);

    expect(ledger.undecided().map((entry) => entry.words)).toEqual([['UFW']]);
    expect(ledger.unused()).toEqual([stale]);
  });

  it('cuts a whole section of a plan, named by the hash of its title, up to the next heading of the same level', () => {
    const plan = '## A\n\nuno\n\n## Sección privada\n\n### Detalle\n\nsecreto\n\n## B\n\ndos';

    expect(withoutSection(plan, { session: 's', hash: hashOf('Sección privada') })).toBe(
      `## A\n\nuno\n\n${MARK}\n\n## B\n\ndos`,
    );
  });

  it('keeps a table whole when one of its rows is omitted', () => {
    expect(omittedLine('| a | b | c |')).toBe(`| ${MARK} | | |`);
    expect(omittedLine('  - un elemento')).toBe(`  - ${MARK}`);
  });

  it('writes a run of omitted lines or paragraphs as a single mark, so that their number says nothing', () => {
    const lines = Array.from({ length: 3 }, (_, index) => ({
      session: '45aec011',
      uuid: 'u-1',
      hash: hashOf(`- ${String(index)}`),
    }));
    const ledger = new OmissionLedger({ paragraphs: [], sections: [], lines }, []);

    expect(ledger.apply({ ...block, text: '- 0\n- 1\n- 2\n- tres' })).toBe(`- ${MARK}\n- tres`);
    expect(collapseMarks(`${MARK}\n| ${MARK} | |\nfin`)).toBe(`${MARK}\nfin`);
  });

  it('needs no decision for the mark itself, although it names the server', () => {
    const ledger = new OmissionLedger({ paragraphs: [], sections: [] }, ['servidor']);
    ledger.apply({ ...block, text: MARK });

    expect(ledger.undecided()).toEqual([]);
  });
});

describe('D-189 scanning the deliverables', () => {
  it('delivers the README, the guide, ai-workspace, the pages of docs/ and deploy/, and not the code', () => {
    expect(
      [
        'README.md',
        'GUIA-EVALUADOR.md',
        'ai-workspace/diario.md',
        'docs/recorrido/index.html',
        'deploy/demo/x.yml',
      ].every(isDeliverable),
    ).toBe(true);
    expect(
      ['apps/api/src/main.ts', 'scripts/privacy/reviewed.json', 'docs/capturas/x.webp'].some(isDeliverable),
    ).toBe(false);
  });

  it('finds a private term and the paragraphs with alert words, ignoring the mark', () => {
    const text = `Uno con alias-x.\n\nEl UFW del servidor.\n\n${MARK}`;
    const found = scanText({ file: 'f.md', text, terms: ['alias-x'], alerts: ['UFW', 'servidor'] });

    expect(found.terms.map((finding) => finding.words)).toEqual([['alias-x']]);
    expect(found.alerts.map((finding) => finding.words)).toEqual([['UFW', 'servidor']]);
  });

  it('finds a forbidden phrase whatever its case or line breaks, and not inside the mark', () => {
    const [phrase = ''] = FORBIDDEN_PHRASES;
    const split = phrase.toUpperCase().replace(' ', '\n');

    expect(forbiddenPhrasesIn(`Uno con ${split}.`)).toEqual([phrase]);
    expect(forbiddenPhrasesIn(`Uno con ${MARK}.`)).toEqual([]);
  });

  it('records the reviewed paragraphs by file and sorted, without repeating one', () => {
    const finding = (file: string, hash: string) => ({ file, hash, words: [], text: '' });

    expect(
      reviewedFrom([finding('b.md', '2'), finding('a.md', '9'), finding('b.md', '1'), finding('b.md', '2')]),
    ).toEqual({
      'a.md': ['9'],
      'b.md': ['1', '2'],
    });
  });
});

describe('D-188 writing the Markdown', () => {
  it('moves the headings of a message below the turn, escapes HTML outside code and closes an open fence', () => {
    expect(sanitize('# Título\n<details> y `<b>`\n```ts\n# no es un título')).toBe(
      '#### Título\n&lt;details> y `<b>`\n```ts\n# no es un título\n```',
    );
  });

  it('numbers each turn, so that every one has its own anchor', () => {
    const info = { id: SESSION_ID, file: 'x.md', title: 'Título', prompts: ['01-analisis.md'], prs: [1] };
    const blocks = parseSession(SESSION.slice(0, 3).join('\n')).blocks;
    const markdown = renderConversation({
      info,
      models: ['claude-opus-5-5'],
      branches: ['main'],
      first: '',
      last: '',
      blocks,
    });

    expect(markdown.match(/^## .*$/gm)).toEqual([
      '## 1 · Alejandro · 13/11 18:10',
      '## 2 · Claude · 13/11 18:10',
    ]);
    expect(markdown).toContain('| Modelo | Claude Opus 5.5 |');
  });
});

describe('D-189 the converter refuses to publish raw data', () => {
  const work = mkdtempSync(join(tmpdir(), 'conversaciones-'));
  const privateFile = join(work, 'privado.txt');
  const session = join(work, 'session.jsonl');
  const rules = join(work, 'omissions.json');
  writeFileSync(privateFile, '[tapar]\nalias-x\n[alerta]\nUFW\n');
  writeFileSync(rules, '{ "paragraphs": [], "sections": [] }\n');
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      [CLI, '--privado', privateFile, '--omisiones', rules, '--sesion', session, ...args],
      { encoding: 'utf8' },
    );

  it('writes nothing while a paragraph with an alert has no decision', () => {
    writeFileSync(session, human('El UFW del servidor.'));
    const result = run('--salida', join(work, 'out'));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('alert without a decision');
  });

  it('converts a session with the data covered', () => {
    writeFileSync(session, human('Acceso con ssh alias-x a 10.1.2.3.'));
    const result = run('--salida', join(work, 'out'));

    expect(result.status).toBe(0);
    expect(readFileSync(join(work, 'out', '01-fases-y-p0-p3.md'), 'utf8')).toContain(
      `Acceso con ssh ${MARK} a ${MARK}.`,
    );
  });

  it('never writes the raw conversations nor reads the private file inside the repository', () => {
    expect(run('--salida', join(REPO_ROOT, 'ai-workspace', 'raw'), '--sin-tapar').stderr).toContain(
      'never goes inside',
    );
    const inside = spawnSync(
      process.execPath,
      [CLI, '--privado', join(REPO_ROOT, 'package.json'), '--sesion', session, '--salida', work],
      { encoding: 'utf8' },
    );

    expect(inside.stderr).toContain('must live outside the repository');
  });
});
