import { stripSeparators } from './strip-separators.js';

/**
 * The tax id part of a customer search (04-contrato-api §3.3): the query normalized like a stored tax id, without
 * separators and in uppercase. `null` when no stored tax id can contain it: something that is not an ASCII letter or
 * digit remains (`%`, `_`, `Ñ`), or nothing does («-», «.»). An empty term would be inside every tax id and return all
 * the customers, so the caller must not filter by this field (D-136).
 */
export function taxIdSearchTerm(query: string): string | null {
  const stripped = stripSeparators(query);
  return stripped === null || stripped === '' ? null : stripped.toUpperCase();
}
