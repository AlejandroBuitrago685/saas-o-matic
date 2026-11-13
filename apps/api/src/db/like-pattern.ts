/** The escape character of every `LIKE` of the API: `!`, because `\` has no special meaning in SQLite. */
export const LIKE_ESCAPE = '!';

const LIKE_SPECIAL = /[!%_]/g;

/**
 * A `LIKE … ESCAPE '!'` pattern that matches the term anywhere in the value. `!`, `%` and `_` are escaped, so they are
 * plain characters and a search for `%` never matches everything (RNF-SEC-02, AC-31). The pattern always goes to
 * SQLite as a bound parameter, never inside the SQL text.
 */
export function containsPattern(term: string): string {
  return `%${term.replace(LIKE_SPECIAL, (special) => `${LIKE_ESCAPE}${special}`)}%`;
}
