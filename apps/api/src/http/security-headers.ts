import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

const ONE_YEAR_SECONDS = 31_536_000;

/** HSTS as helmet writes it, only in production (there is HTTPS in front). */
export const HSTS_HEADER = {
  'strict-transport-security': `max-age=${String(ONE_YEAR_SECONDS)}; includeSubDomains`,
};

/**
 * The RNF-SEC-06 headers as helmet writes them. Helmet sets them on every routed response; the few responses Fastify
 * sends before routing (see `createFrameworkErrorHandler`) copy them from here, and a test keeps both in step.
 */
export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy': "default-src 'none';frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-site',
  'x-frame-options': 'DENY',
};

/**
 * API headers of RNF-SEC-06 (AC-52): the API only serves JSON, so its CSP forbids everything. HSTS only in production,
 * where there is HTTPS in front. Fastify sends no `Server` nor `X-Powered-By`, and helmet would remove the latter.
 */
export async function registerSecurityHeaders(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    xFrameOptions: { action: 'deny' },
    strictTransportSecurity: isProduction ? { maxAge: ONE_YEAR_SECONDS, includeSubDomains: true } : false,
  });
}
