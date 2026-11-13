/** `a, b,,c ` → `['a', 'b', 'c']`: list variables of the environment (CORS_ORIGINS, TRUST_PROXY). */
export const commaList = (list: string): string[] =>
  list
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
