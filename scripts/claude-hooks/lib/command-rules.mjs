// @ts-check
/**
 * Shell command rules of the PreToolUse hook (D-80, D-85, D-87).
 * Each rule reads one segment of the command (split on `&&`, `||`, `;`, `|` and new lines), without quoted text
 * and without heredoc bodies that are plain text; short flag groups are expanded (`-nm` → `-n -m`). So
 * `git switch -c x && git add .` is allowed and `git branch -df x` is not. The .env check reads the whole text.
 * It protects against mistakes, not against someone determined to bypass it.
 */

const QUOTED = /(["'])(?:\\.|(?!\1)[^\\])*\1/g;
/** A flag written between quotes is still a flag: `"--no-verify"` → `--no-verify`. */
const QUOTED_FLAG = /(["'])(-[\w-]+)\1/g;
const HEREDOC = /<<-?[ \t]*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g;
/** A heredoc fed to one of these runs commands: its body is kept. */
const INTERPRETER = /\b(bash|sh|zsh|node|python3?|py|pwsh|powershell)\b[^\n]*$/;
const SEGMENT_SEPARATOR = /&&|\|\||[;|\n]/;
const ENV_IN_TEXT = /(^|[\s'"/\\=:*])\.env(\.(?!example\b)[\w.*-]+)?(?=$|[\s'"|;&>)*?[\]])/i;
/** Commands whose message, title or body values are free text and may mention .env. */
const HAS_FREE_TEXT = /\b(git\s+(commit|tag)|gh\s+(pr|issue))\b/;
const FREE_TEXT_VALUE =
  /((?:^|\s)(?:-m|--message|-t|--title|-b|--body)(?:\s+|=))(["'])(?:\\.|(?!\2)[^\\])*\2/g;
const MIGRATIONS = String.raw`(^|[\s'"/\\])drizzle[/\\]`;
const WRITES_MIGRATION = new RegExp(
  [
    String.raw`\b(rm|mv|cp|truncate|Remove-Item|Move-Item|Copy-Item|Set-Content|Clear-Content|Out-File)\b[^|;&]*${MIGRATIONS}`,
    String.raw`\bsed\s+-i[^|;&]*${MIGRATIONS}`,
    String.raw`(>|\btee\b)\s*[^|;&\s]*${MIGRATIONS}`,
  ].join('|'),
  'i',
);

/** @param {string} command */
export function stripQuoted(command) {
  return command.replace(QUOTED, '""');
}

/**
 * Removes heredoc bodies that are plain text (`cat > notes.md <<EOF`) and keeps the first line, which may
 * redirect to a file, and the bodies fed to an interpreter (`bash <<EOF`).
 * @param {string} command
 */
export function withoutHeredocBodies(command) {
  let result = '';
  let last = 0;
  for (const match of command.matchAll(HEREDOC)) {
    const start = match.index;
    const [whole, , word = '', rest = ''] = match;
    const before = command.slice(command.lastIndexOf('\n', start) + 1, start);
    result += command.slice(last, start) + (INTERPRETER.test(before) ? whole : `<<${word}${rest}`);
    last = start + whole.length;
  }
  return result + command.slice(last);
}

/**
 * True when the text references a .env file other than .env.example (any case, globs included).
 * @param {string} text
 */
export function mentionsEnvFile(text) {
  return ENV_IN_TEXT.test(text);
}

/**
 * Segments of the command, each with its tokens (short flag groups expanded).
 * @param {string} command
 * @returns {{ text: string, tokens: string[] }[]}
 */
function segments(command) {
  const prepared = stripQuoted(withoutHeredocBodies(command).replace(QUOTED_FLAG, '$2'));
  return prepared.split(SEGMENT_SEPARATOR).map((text) => ({
    text,
    tokens: text
      .split(/\s+/)
      .filter((token) => token !== '')
      .flatMap((token) =>
        /^-[a-zA-Z]{2,}$/.test(token) ? [token, ...[...token.slice(1)].map((c) => `-${c}`)] : [token],
      ),
  }));
}

/** @param {readonly string[]} list @param {RegExp} pattern */
const anyToken = (list, pattern) => list.some((token) => pattern.test(token));
/** @param {readonly string[]} list @param {readonly string[]} flags */
const hasFlag = (list, flags) => flags.some((flag) => list.includes(flag));
/** `git <name>`, also with `-C <dir>` or `-c <key=value>` before the subcommand. */
const git = (/** @type {string} */ names) => new RegExp(String.raw`\bgit(\s+-[Cc]\s+\S+)*\s+(${names})\b`);

const DISCARDS_WORK = 'Discarding uncommitted work is not allowed: ask the user to do it.';
const SKIPS_HOOKS = 'Skipping or disabling the git hooks is not allowed.';

/** @type {{ when: RegExp, test: (list: string[]) => boolean, reason: string }[]} */
const RULES = [
  { when: /\bLEFTHOOK=0\b|\bcore\.hooksPath\b/, test: () => true, reason: SKIPS_HOOKS },
  {
    when: git('commit'),
    test: (list) => hasFlag(list, ['-n']) || anyToken(list, /^--no-v(e(r(i(fy?)?)?)?)?$/),
    reason: SKIPS_HOOKS,
  },
  {
    when: git('push'),
    test: (list) => hasFlag(list, ['-f']) || anyToken(list, /^(--force.*|\+.+)$/),
    reason: 'Forced pushes are not allowed.',
  },
  {
    when: git('switch|checkout'),
    test: (list) => hasFlag(list, ['-f', '--force', '--discard-changes', '--', '.']),
    reason: DISCARDS_WORK,
  },
  {
    when: git('restore'),
    test: (list) => hasFlag(list, ['--worktree', '-W']) || !hasFlag(list, ['--staged', '-S']),
    reason: DISCARDS_WORK,
  },
  { when: git('reset'), test: (list) => list.includes('--hard'), reason: DISCARDS_WORK },
  { when: git('clean'), test: (list) => hasFlag(list, ['-f', '--force']), reason: DISCARDS_WORK },
  {
    when: git('branch'),
    test: (list) =>
      hasFlag(list, ['-D']) || (hasFlag(list, ['--delete', '-d']) && hasFlag(list, ['--force', '-f'])),
    reason: 'Force-deleting branches is not allowed.',
  },
  {
    when: /\bdrizzle-kit\s+(push|drop)\b/,
    test: () => true,
    reason: 'drizzle-kit push/drop are forbidden: generate and commit a new migration.',
  },
];

/**
 * @param {string} command
 * @returns {string | undefined} why the command is forbidden, or undefined when it is allowed
 */
export function forbiddenCommandReason(command) {
  for (const { text, tokens } of segments(command)) {
    const rule = RULES.find(({ when, test }) => when.test(text) && test(tokens));
    if (rule) return rule.reason;
  }
  // Paths may be quoted: this rule reads the text with its quotes (heredoc bodies that are text removed).
  const commandPart = withoutHeredocBodies(command);
  if (new RegExp(MIGRATIONS).test(commandPart) && WRITES_MIGRATION.test(commandPart)) {
    return 'Committed migrations are immutable: create a new migration instead.';
  }
  // The .env check reads the whole text, heredoc bodies included (a script there could read the file);
  // only the values of -m/--message/--title/--body are skipped.
  const checked = HAS_FREE_TEXT.test(command) ? command.replace(FREE_TEXT_VALUE, '$1""') : command;
  return mentionsEnvFile(checked) ? '.env files must not be read or written (RNF-SEC-12).' : undefined;
}
