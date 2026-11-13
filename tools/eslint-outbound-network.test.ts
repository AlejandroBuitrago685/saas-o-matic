import { describe, expect, it } from 'vitest';

import { lintFixture, ruleIds } from './lint-fixture.js';

const F = '__lint_fixture__';

/** One file per API zone: every one forbids an outbound client (each zone has its own `no-restricted-imports`). */
const API_ZONES = [
  `apps/api/src/${F}root.ts`,
  `apps/api/src/http/${F}http.ts`,
  `apps/api/src/db/${F}db.ts`,
  `apps/api/src/shared/${F}shared.ts`,
  `apps/api/src/config/${F}config.ts`,
  `apps/api/src/seed/${F}seed.ts`,
  `apps/api/src/modules/customers/${F}mapper.ts`,
  `apps/api/src/modules/customers/${F}x.routes.ts`,
  `apps/api/src/modules/customers/${F}x.use-case.ts`,
  `apps/api/src/modules/customers/${F}x.repository.ts`,
] as const;

describe('AC-59 D-154 the backend has no outbound client (review, automated)', () => {
  it.each(API_ZONES)('rejects node:https in %s', async (path) => {
    const code = "import { request } from 'node:https';\nexport const send = request;\n";

    expect(ruleIds(await lintFixture(path, code))).toContain('@typescript-eslint/no-restricted-imports');
  });

  it.each(['node:http', 'http', 'node:http2', 'node:tls', 'node:dgram', 'undici', 'axios', 'node-fetch'])(
    'rejects %s',
    async (moduleName) => {
      const code = `import * as client from '${moduleName}';\nexport const used = client;\n`;
      const findings = await lintFixture(`apps/api/src/shared/${F}client.ts`, code);

      expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
    },
  );

  // Regression of the P9 review: `importNames` let the default and namespace imports through.
  it.each([
    ["import net from 'node:net';", 'export const open = net.connect;'],
    ["import * as net from 'node:net';", 'export const open = net.createConnection;'],
    ["import { Socket } from 'node:net';", 'export const socket = new Socket();'],
    ["import { createConnection } from 'net';", 'export const open = createConnection;'],
  ])('rejects any other use of node:net: %s', async (...lines) => {
    const findings = await lintFixture(`apps/api/src/shared/${F}net-other.ts`, `${lines.join('\n')}\n`);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it.each([
    'node:child_process',
    'node:dns',
    'dns/promises',
    'node:worker_threads',
    'node:cluster',
    'superagent',
  ])('rejects %s, another way out', async (moduleName) => {
    const code = [`import * as way from '${moduleName}';`, 'export const used = way;', ''].join('\n');
    const findings = await lintFixture(`apps/api/src/shared/${F}way-out.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it.each([
    ['a dynamic import of a client', ["export const load = (): Promise<unknown> => import('node:https');"]],
    [
      'require',
      [
        'declare const require: (id: string) => unknown;',
        "export const http: unknown = require('node:http');",
      ],
    ],
    ['process.getBuiltinModule', ["export const http: unknown = process.getBuiltinModule('node:http');"]],
    ['globalThis.fetch', ['export const client: unknown = globalThis.fetch;']],
  ])('rejects %s', async (_case, lines) => {
    const code = `${lines.join('\n')}\n`;
    const findings = await lintFixture(`apps/api/src/shared/${F}bypass.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-syntax');
  });

  it('still allows a dynamic import of a package that is not a client (Swagger UI, D-110)', async () => {
    const code = "export const load = (): Promise<unknown> => import('@fastify/swagger-ui');\n";
    const findings = await lintFixture(`apps/api/src/http/${F}dynamic-ok.ts`, code);

    expect(findings).toEqual([]);
  });

  it('rejects the parts of node:net that open a connection', async () => {
    const code = "import { connect } from 'node:net';\nexport const open = connect;\n";
    const findings = await lintFixture(`apps/api/src/shared/${F}net-connect.ts`, code);

    expect(ruleIds(findings)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('still allows isIP from node:net (trust-proxy.ts)', async () => {
    const code =
      "import { isIP } from 'node:net';\nexport const isAddress = (value: string): boolean => isIP(value) !== 0;\n";
    const findings = await lintFixture(`apps/api/src/config/${F}net-is-ip.ts`, code);

    expect(findings).toEqual([]);
  });

  it.each(['fetch', 'WebSocket', 'XMLHttpRequest'])('rejects the global %s, also in a test', async (name) => {
    const code = `export const client: unknown = ${name};\n`;
    const findings = await lintFixture(`apps/api/src/modules/customers/${F}global.test.ts`, code);

    expect(ruleIds(findings)).toContain('no-restricted-globals');
  });
});
