import { isIP } from 'node:net';

import { z } from 'zod';

import { commaList } from './comma-list.js';

/**
 * The only named range of `proxy-addr` accepted. `uniquelocal` and `linklocal` are left out on purpose: in a corporate
 * network the clients themselves have private addresses, and one connecting directly could choose its IP.
 */
const PRESETS: readonly string[] = ['loopback'];

const MAX_PREFIX: Readonly<Record<number, number>> = { 4: 32, 6: 128 };

/** An address, a CIDR range that is not "everything" (`/0`), or a preset. */
function isProxyEntry(entry: string): boolean {
  if (PRESETS.includes(entry)) return true;
  const [address = '', prefix, ...rest] = entry.split('/');
  const maxPrefix = MAX_PREFIX[isIP(address)];
  if (maxPrefix === undefined || rest.length > 0) return false;
  if (prefix === undefined) return true;
  const bits = Number(prefix);
  return /^\d{1,3}$/.test(prefix) && bits >= 1 && bits <= maxPrefix;
}

/**
 * D-105, D-113: `false` (no proxy in front) or the proxies whose X-Forwarded-For entries are trusted. `request.ip` is the
 * first address, from the right, that is not one of them, so a client cannot choose its IP by prepending fake ones.
 * Fastify 5.12 no longer trusts a number of hops (it would not check who is connecting), and `true` would trust any
 * header: neither is accepted.
 */
export const trustProxySchema = z.union([
  z.literal('false').transform(() => false as const),
  z
    .string()
    .transform(commaList)
    .pipe(
      z
        .array(
          z
            .string()
            .refine(isProxyEntry, 'must be false or proxy addresses, CIDR ranges or loopback (never true)'),
        )
        .min(1),
    ),
]);
