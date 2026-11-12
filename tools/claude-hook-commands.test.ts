import { describe, expect, it } from 'vitest';

import { decidePreTool } from '../scripts/claude-hooks/pre-tool.mjs';

const missing = (): boolean => false;

function isBlocked(tool: string, command: string): boolean {
  return decidePreTool({ tool_name: tool, tool_input: { command } }, missing).block;
}

describe('D-80 / D-85 PreToolUse hook: shell commands', () => {
  it.each([
    'git commit --no-verify -m "feat: x"',
    'git commit -n -m "feat: x"',
    'git commit -nm "feat: x"',
    'git commit --no-veri -m "feat: x"',
    'git push --force origin main',
    'git push -f',
    'git push --force-with-lease',
    'git push origin +main',
  ])('blocks skipping hooks or forcing a push: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each([
    'git switch -f main',
    'git switch --discard-changes main',
    'git checkout -- apps/api/src/app.ts',
    'git checkout .',
    'git restore apps/api/src/app.ts',
    'git restore --staged --worktree apps/api/src/app.ts',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git clean -xdf',
    'git branch -D feat/x',
    'git branch --delete --force feat/x',
  ])('blocks discarding work or force-deleting branches: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each([
    'npx drizzle-kit push',
    'npx drizzle-kit drop',
    'rm apps/api/drizzle/0000_init.sql',
    'sed -i s/a/b/ apps/api/drizzle/0000_init.sql',
    'echo x > apps/api/drizzle/0000_init.sql',
  ])('blocks rewriting migrations: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each([
    'cat apps/api/.env',
    'cp .env.example .env',
    'cat .ENV',
    'cat .env*',
    'grep KEY .env.local',
    'git commit -m "x" && cat .env',
  ])('blocks reading or writing .env files: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each(['Get-Content .\\.Env', 'Remove-Item apps\\api\\drizzle\\0000_init.sql'])(
    'applies the same rules to PowerShell: %s',
    (command) => {
      expect(isBlocked('PowerShell', command)).toBe(true);
    },
  );

  it.each([
    'git branch -df feat/x',
    'git commit "--no-verify" -m "x"',
    'LEFTHOOK=0 git commit -m "x"',
    'git -c core.hooksPath=/dev/null commit -m "x"',
    'git -C . reset --hard',
    "bash <<'EOF'\ngit reset --hard\nEOF",
    'cp x.sql apps/api/drizzle/0000_init.sql',
  ])('closes the gaps found in the second review: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each([
    'gh pr create --title x --body-file ".env"',
    'git commit -m "x" && cat ".env"',
    'git commit -F .env',
  ])('only skips .env inside -m/--title/--body values, never in a path: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(true);
  });

  it.each([
    'git commit -m "docs: drizzle-kit drop and git reset --hard are blocked"',
    'gh pr create --title "P0" --body "git restore, .env and --no-verify are blocked"',
    'git switch -c feat/p1 && git add .',
    'git switch -c feat/p1 && npm test -- --run',
    'git log -n 1 && git commit -m "x"',
    'git status; git diff --stat',
  ])('reads each segment on its own and ignores quoted text: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(false);
  });

  it('ignores rules written as text in a heredoc body, but not a redirection on its first line', () => {
    const notes = "cat > notes.md <<'EOF'\nnpx drizzle-kit drop and git reset --hard are blocked\nEOF";
    const migration = "cat > apps/api/drizzle/0000_init.sql <<'EOF'\nSELECT 1;\nEOF";

    expect(isBlocked('Bash', notes)).toBe(false);
    expect(isBlocked('Bash', migration)).toBe(true);
  });

  it('still blocks .env anywhere in the text, heredoc bodies included (a script there could read it)', () => {
    expect(isBlocked('Bash', "python - <<'EOF'\nprint(open('.env').read())\nEOF")).toBe(true);
  });

  it.each([
    'git commit -m "feat: add x"',
    'git commit -m "docs: explain -n and --no-verify"',
    'git commit -m "chore: ignore .env files"',
    'git commit --amend --no-edit',
    'git push origin feat/p0',
    'git push -u origin feat/p0-scaffolding',
    'git switch -c feat/p1',
    'git checkout -b feat/p1',
    'git restore --staged apps/api/src/app.ts',
    'git branch -d feat/x',
    'git clean -n',
    'npx drizzle-kit generate',
    'ls apps/api/drizzle/ 2>&1',
    'cat .env.example',
    'npm run lint',
  ])('allows: %s', (command) => {
    expect(isBlocked('Bash', command)).toBe(false);
  });
});
