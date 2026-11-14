// @ts-check
/**
 * Tool calls of a session, reduced to what a reader needs (D-188): one line per call with its name and description,
 * never its output. Some results carry words of the user (the answer to a question, the reply to a plan) or the
 * report of a subagent; those are kept, the rest of the output is not.
 */

/**
 * @typedef {import('./read-session.mjs').Entry} Entry
 * @typedef {{ name: string, input: Record<string, unknown> }} Call
 */

const REPO_PATH = /^[a-z]:[\\/]users[\\/]usuario[\\/]desktop[\\/]proyectos[\\/]web[\\/]saas-o-matic[\\/]?/i;
const USER_SAID = 'the user said:\n';
/** The two ways the app has written the answers to AskUserQuestion. */
const ANSWERED = /^(?:Your questions have been answered|The user answered):/;
const MAX_SUMMARY = 600;

/**
 * @param {unknown} value
 * @returns {string}
 */
const asText = (value) => (typeof value === 'string' ? value : '');

/**
 * @param {string} path an absolute path of the project, as a tool received it
 * @returns {string} the path relative to the repository, with forward slashes
 */
export function repoRelative(path) {
  return path.replace(REPO_PATH, '').replace(/\\/g, '/');
}

/**
 * @param {string} name the name of a tool, an MCP one included (`mcp__server__tool`)
 * @returns {string}
 */
export function shortToolName(name) {
  return name.split('__').at(-1) ?? name;
}

/** @type {Record<string, (input: Record<string, unknown>) => string>} */
const DESCRIBE = {
  Bash: (input) => asText(input['description']),
  PowerShell: (input) => asText(input['description']),
  Read: (input) => `\`${repoRelative(asText(input['file_path']))}\``,
  Edit: (input) => `\`${repoRelative(asText(input['file_path']))}\``,
  Write: (input) => `\`${repoRelative(asText(input['file_path']))}\``,
  Grep: (input) => `\`${asText(input['pattern'])}\``,
  Glob: (input) => `\`${asText(input['pattern'])}\``,
  Agent: (input) => `${asText(input['subagent_type']) || 'general-purpose'}: ${asText(input['description'])}`,
  Task: (input) => `${asText(input['subagent_type']) || 'general-purpose'}: ${asText(input['description'])}`,
  Skill: (input) => asText(input['skill']),
  WebSearch: (input) => asText(input['query']),
  WebFetch: (input) => asText(input['url']),
  wrap_up: (input) => asText(input['recap']),
};

/**
 * @param {Record<string, unknown>} input the input of AskUserQuestion
 * @returns {string[]} its questions
 */
function questionsOf(input) {
  const questions = Array.isArray(input['questions']) ? input['questions'] : [];
  return questions.map((question) => asText(question?.question));
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} input
 * @returns {string} one line: the name of the tool and what it was asked to do
 */
export function toolLine(name, input) {
  const short = shortToolName(name);
  const description = (DESCRIBE[short]?.(input) ?? '').replace(/\s+/g, ' ').trim();
  return description === '' ? `\`${short}\`` : `\`${short}\` · ${description}`;
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} input
 * @returns {string[]} the lines of a call: one, or one per question for AskUserQuestion, so that each question is a
 * paragraph of its own and can be omitted alone (D-189)
 */
export function toolLines(name, input) {
  if (shortToolName(name) !== 'AskUserQuestion') return [toolLine(name, input)];
  return questionsOf(input).map(
    (question) => `\`AskUserQuestion\` · ${question.replace(/\s+/g, ' ').trim()}`,
  );
}

/**
 * @param {string[]} questions the questions asked, in order
 * @param {string} result what AskUserQuestion returned
 * @returns {string} one line per question with the answer chosen
 */
export function answersOf(questions, result) {
  const markers = questions.map((question) => result.indexOf(`"${question}"="`));
  if (markers.some((index) => index < 0)) return result;
  // The app closes the answers with `". ` and a sentence for Claude, which changed between versions.
  const end = result.lastIndexOf('". ');
  return questions
    .map((question, index) => {
      const start = (markers[index] ?? 0) + question.length + 4;
      const next = markers[index + 1];
      const stop = next === undefined ? (end < 0 ? result.length : end) : next - 3;
      const answer = result
        .slice(start, stop)
        .replace(/^"|"$/g, '')
        .replace(/" user notes: /g, ' — nota: ');
      return `- **${question}** → ${answer}`;
    })
    .join('\n\n');
}

/**
 * @param {Call} call the tool call the result answers
 * @param {string} result its output
 * @returns {Entry | undefined} the words of the user or the report of a subagent it carries, if any
 */
export function userReplyOf(call, result) {
  const short = shortToolName(call.name);
  const said = result.indexOf(USER_SAID);
  if (said >= 0) return { author: 'user', kind: 'text', text: result.slice(said + USER_SAID.length).trim() };
  if (result.startsWith("The user doesn't want to proceed")) {
    return { author: 'user', kind: 'note', text: `*(Rechaza la llamada a \`${short}\`)*` };
  }
  if (short === 'ExitPlanMode') return planReplyOf(result);
  if (short === 'AskUserQuestion' && ANSWERED.test(result)) {
    return { author: 'user', kind: 'text', text: answersOf(questionsOf(call.input), result) };
  }
  return agentResultOf(call, result);
}

/**
 * @param {string} result what ExitPlanMode returned
 * @returns {Entry} the approval, or the reply of the user, which older versions of the app store as the whole result
 */
function planReplyOf(result) {
  if (result.startsWith('User has approved your plan')) {
    return { author: 'user', kind: 'note', text: '*(Aprueba el plan)*' };
  }
  return { author: 'user', kind: 'text', text: result.trim() };
}

/**
 * @param {Call} call
 * @param {string} result
 * @returns {Entry | undefined} the summary of the report of a subagent that answered in the same turn
 */
function agentResultOf(call, result) {
  const short = shortToolName(call.name);
  if (short !== 'Agent' && short !== 'Task') return undefined;
  // An agent that runs in the background answers later, in its own message: its launch says nothing to a reader.
  if (result.startsWith('Async agent launched') || result.includes('was delivered to you as a message')) {
    return undefined;
  }
  const name = asText(call.input['subagent_type']) || 'general-purpose';
  return {
    author: 'claude',
    kind: 'agent',
    text: `Resultado del subagente \`${name}\`: ${summaryOf(result)}`,
  };
}

/**
 * @param {string} report the report of a subagent
 * @returns {string} its verdict (also when it is a heading), or else its first paragraph that is not a heading,
 * shortened
 */
export function summaryOf(report) {
  const paragraphs = report
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    // The notes the harness adds on top of a report are not part of it.
    .filter((paragraph) => paragraph !== '' && !paragraph.startsWith('[harness:'));
  const verdict = paragraphs.find((paragraph) => /veredicto|\bAPTO\b/i.test(paragraph));
  const chosen =
    verdict?.replace(/^#+\s*/, '') ?? paragraphs.find((paragraph) => !paragraph.startsWith('#')) ?? '';
  return chosen.length > MAX_SUMMARY ? `${chosen.slice(0, MAX_SUMMARY)}…` : chosen;
}

/**
 * @param {{ name?: string, body?: string }} origin a report a subagent sent back to the session
 * @returns {string}
 */
export function agentReportSummary(origin) {
  const body = origin.body ?? '';
  const marker = body.indexOf('The report follows:');
  const report = marker < 0 ? body : body.slice(marker + 'The report follows:'.length);
  const name = origin.name ?? 'subagente';
  return `Resultado del subagente \`${name}\`: ${summaryOf(report.replace(/^ {2}/gm, ''))}`;
}
