// @ts-check
/**
 * Writes a conversation as Markdown that reads well on GitHub (D-188): one numbered heading per turn, so that each one
 * has a stable anchor to link to, and the messages as they were, with their headings moved below the turn's and the
 * HTML outside code escaped so that no message can break the page.
 */

/**
 * @typedef {import('./read-session.mjs').Block} Block
 * @typedef {{ id: string, file: string, title: string, prompts: string[], prs: number[] }} SessionInfo
 * @typedef {{ info: SessionInfo, models: string[], branches: string[], first: string, last: string,
 *   blocks: Block[] }} Conversation
 */

const REPO_URL = 'https://github.com/AlejandroBuitrago685/saas-o-matic';
const AUTHORS = { user: 'Alejandro', claude: 'Claude' };
const MODEL_NAMES = { 'claude-opus-5-5': 'Claude Opus 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5' };

/**
 * @param {string} iso
 * @returns {string} `dd/mm hh:mm`, in UTC, which in November is the time of the Canary Islands
 */
export function shortTime(iso) {
  const [date = '', time = ''] = iso.split('T');
  const [, month = '', day = ''] = date.split('-');
  return `${day}/${month} ${time.slice(0, 5)}`;
}

/**
 * @param {string} line a line outside code fences
 * @returns {string} the line with HTML tags escaped outside inline code; autolinks stay
 */
function escapeHtml(line) {
  return line
    .split(/(`[^`]*`)/g)
    .map((part) => (part.startsWith('`') ? part : part.replace(/<(?=[a-z/!?])(?!https?:)/gi, '&lt;')))
    .join('');
}

/**
 * @param {string} markdown the text of one message
 * @returns {string} the same text, safe to place under a turn heading: headings three levels lower, HTML outside
 * code escaped and any code fence left open closed
 */
export function sanitize(markdown) {
  let fence = '';
  const lines = markdown.split('\n').map((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker !== undefined && (fence === '' || marker.startsWith(fence))) {
      fence = fence === '' ? marker : '';
      return line;
    }
    if (fence !== '') return line;
    return escapeHtml(
      line.replace(/^(#{1,6})(?=\s)/, (hashes) => '#'.repeat(Math.min(6, hashes.length + 3))),
    );
  });
  if (fence !== '') lines.push(fence);
  return lines.join('\n');
}

/**
 * @param {Block} block
 * @returns {string}
 */
function renderBlock(block) {
  switch (block.kind) {
    case 'text':
      return sanitize(block.text);
    case 'tool':
      return `- 🔧 ${escapeHtml(block.text)}`;
    case 'agent':
      return `> 🤖 ${escapeHtml(block.text)}`;
    case 'plan':
      return `<details>\n<summary>Plan presentado para aprobar</summary>\n\n${sanitize(block.text)}\n\n</details>`;
    case 'note':
      return escapeHtml(block.text);
  }
}

/**
 * @param {readonly Block[]} blocks the blocks of one turn
 * @returns {string} tool lines stay together as one list; everything else is separated by a blank line
 */
function renderTurnBody(blocks) {
  return blocks
    .map((block, index) => {
      const glue = index > 0 && block.kind === 'tool' && blocks[index - 1]?.kind === 'tool' ? '\n' : '\n\n';
      return (index === 0 ? '' : glue) + renderBlock(block);
    })
    .join('');
}

/**
 * @param {readonly Block[]} blocks
 * @returns {Block[][]} the blocks grouped into turns: a turn ends when the author changes
 */
export function turnsOf(blocks) {
  /** @type {Block[][]} */
  const turns = [];
  for (const block of blocks) {
    const current = turns.at(-1);
    if (current !== undefined && current[0]?.author === block.author) current.push(block);
    else turns.push([block]);
  }
  return turns;
}

/**
 * @param {Conversation} conversation
 * @returns {string} the table at the top of the file
 */
function header({ info, models, branches, first, last }) {
  const modelNames = models.map((model) => MODEL_NAMES[/** @type {keyof MODEL_NAMES} */ (model)] ?? model);
  const prompts = info.prompts.map((file) => `[${file.slice(0, 2)}](../prompts/${file})`);
  const prs = info.prs.map((number) => `[#${String(number)}](${REPO_URL}/pull/${String(number)})`);
  return [
    `# ${info.title}`,
    '',
    '| | |',
    '|---|---|',
    `| Sesión | \`${info.id.slice(0, 8)}\` |`,
    `| Fechas | ${shortTime(first)} → ${shortTime(last)} de 2026, hora de Canarias (UTC+0) |`,
    `| Modelo | ${modelNames.join(', ') || 'no consta'} |`,
    `| Ramas | ${branches.map((branch) => `\`${branch}\``).join(', ')} |`,
    `| Prompts literales | ${prompts.join(' · ')} |`,
    `| PR | ${prs.join(' · ')} |`,
    '',
    '> Convertida con `scripts/conversaciones/` (D-188, D-189): los mensajes, completos; cada herramienta, en una',
    '> línea y sin su salida; los datos del servidor, tapados. Cómo leerla, en el [README](README.md).',
  ].join('\n');
}

/**
 * @param {Conversation} conversation with its blocks already redacted
 * @returns {string} the Markdown file
 */
export function renderConversation(conversation) {
  const turns = turnsOf(conversation.blocks).map((blocks, index) => {
    const first = blocks.find((block) => block.kind !== 'note') ?? blocks[0];
    const heading = `## ${String(index + 1)} · ${AUTHORS[first?.author ?? 'claude']} · ${shortTime(first?.time ?? '')}`;
    return `${heading}\n\n${renderTurnBody(blocks)}`;
  });
  return `${[header(conversation), ...turns].join('\n\n')}\n`;
}
