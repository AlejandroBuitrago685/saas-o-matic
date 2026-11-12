const COMBINING_MARKS = /\p{M}/gu;

/**
 * Text as it is compared in searches (ADR-006): NFD, without combining marks (accents, tildes) and lowercase. The
 * API stores the company name this way and normalizes the query with the same function, so both always match.
 */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}
