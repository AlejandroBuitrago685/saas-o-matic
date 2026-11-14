import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HSTS_HEADER } from '../apps/api/src/http/security-headers.js';
import { REPO_ROOT } from './lint-fixture.js';

const DEPLOY = join(REPO_ROOT, 'deploy', 'demo');
const read = (path: string): string => readFileSync(join(DEPLOY, path), 'utf8');

/** Every file of `deploy/demo`, relative to it. */
function deployFiles(folder = DEPLOY): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? deployFiles(join(folder, entry.name))
      : [relative(DEPLOY, join(folder, entry.name)).replaceAll('\\', '/')],
  );
}

/** The meaningful lines of an nginx file: no comments, no blank lines, trimmed. */
const directives = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line !== '');

/** The directives at the top level of a `server` block, outside every `location`. */
function serverLevel(text: string): string[] {
  let depth = 0;
  const top: string[] = [];
  for (const line of directives(text)) {
    if (line.endsWith('}')) depth -= 1;
    if (depth === 1 && !line.endsWith('{') && !line.endsWith('}')) top.push(line);
    if (line.endsWith('{')) depth += 1;
  }
  return top;
}

const HTTPS = read('nginx/https.conf.template');
const HTTP = read('nginx/http.conf.template');
const HSTS = HSTS_HEADER['strict-transport-security'];

describe('D-105 D-172 nginx site of the host for the demo (08-despliegue §4)', () => {
  it('includes the Cloudflare snippet in the HTTPS server itself, which is not global', () => {
    expect(serverLevel(HTTPS)).toContain('include __CLOUDFLARE_REALIP_SNIPPET__;');
  });

  it('replaces X-Forwarded-For with the address it restored, never appends what the client sent', () => {
    expect(directives(HTTPS)).toContain('proxy_set_header X-Forwarded-For $remote_addr;');
    expect(HTTPS).not.toContain('$proxy_add_x_forwarded_for');
    expect(HTTPS).not.toContain('$http_x_forwarded_for');
  });

  it('forwards to the web container on 127.0.0.1:4010 only (D-99)', () => {
    expect(directives(HTTPS).filter((line) => line.startsWith('proxy_pass'))).toEqual([
      'proxy_pass http://127.0.0.1:4010;',
    ]);
  });

  it('sends one HSTS header, the value of the API, on every response (RNF-SEC-20)', () => {
    expect(serverLevel(HTTPS)).toEqual(
      expect.arrayContaining([
        'proxy_hide_header Strict-Transport-Security;',
        `add_header Strict-Transport-Security "${HSTS}" always;`,
      ]),
    );
    // An add_header inside a location would drop the ones of the server (nginx inheritance).
    expect(directives(HTTPS).filter((line) => line.startsWith('add_header'))).toHaveLength(1);
  });

  it('lets bodies up to 128 KiB through, so the 413 of 64 KiB is the Problem of the container (D-158)', () => {
    expect(serverLevel(HTTPS)).toContain('client_max_body_size 128k;');
  });

  it('keeps no access log, which would record client IPs (D-134, RNF-SEC-11)', () => {
    expect(serverLevel(HTTPS)).toContain('access_log off;');
    expect(serverLevel(HTTP)).toContain('access_log off;');
  });

  it('redirects HTTP inside `location /`, so the ACME challenge of certbot is never redirected (D-167)', () => {
    expect(serverLevel(HTTP).some((line) => line.startsWith('return'))).toBe(false);
    expect(HTTP).toMatch(/location \/ \{\s*return 301 https:\/\/\$host\$request_uri;\s*\}/);
  });

  it('serves only the demo subdomain', () => {
    for (const site of [HTTP, HTTPS]) {
      expect(serverLevel(site)).toContain('server_name saas-o-matic.codeserviceapi.es;');
    }
  });
});

describe('D-99 D-172 no data of the server in the repository', () => {
  it('uses only the documented placeholders, which are filled in on the server', () => {
    const placeholders = new Set(deployFiles().flatMap((file) => read(file).match(/__[A-Z_]+__/g) ?? []));

    expect([...placeholders].sort()).toEqual([
      '__CLOUDFLARE_REALIP_SNIPPET__',
      '__TLS_CERTIFICATE_KEY__',
      '__TLS_CERTIFICATE__',
    ]);
  });

  it.each(deployFiles().filter((file) => !file.endsWith('.yml')))(
    '%s has no absolute path of the host',
    (file) => {
      expect(read(file)).not.toMatch(/(^|[\s"'=])\/(etc|var|usr|home|opt|srv|root|run|tmp|data)\b/m);
    },
  );

  it.each(deployFiles())(
    '%s has no IP address other than loopback and the Docker network of D-130',
    (file) => {
      const addresses = read(file).match(/\b\d{1,3}(\.\d{1,3}){3}\b/g) ?? [];

      expect(addresses.filter((ip) => ip !== '127.0.0.1' && !ip.startsWith('172.30.0.'))).toEqual([]);
    },
  );
});

describe('D-171 AC-61 Compose override and daily reset of the demo', () => {
  const COMPOSE = read('docker-compose.demo.yml');

  it('trusts only loopback, the gateway (the host nginx) and the web container (D-130)', () => {
    expect(COMPOSE).toMatch(/^\s+TRUST_PROXY: loopback,172\.30\.0\.1,172\.30\.0\.10$/m);
  });

  it('runs the API in demo mode, with 5 writes per minute and IP (D-47, D-173)', () => {
    expect(COMPOSE).toMatch(/^\s+DEMO_MODE: 'true'$/m);
    expect(COMPOSE).toMatch(/^\s+RATE_LIMIT_WRITES_PER_MINUTE: '5'$/m);
    expect(COMPOSE).toMatch(/^\s+CORS_ORIGINS: https:\/\/saas-o-matic\.codeserviceapi\.es$/m);
  });

  it('D-174 keeps the data of the API in a tmpfs, never in a volume: every start finds it empty', () => {
    expect(COMPOSE).toMatch(/^\s+volumes: !reset \[\]$/m);
    expect(COMPOSE).toMatch(
      /tmpfs: !override\n\s+- \/tmp\n\s+- \/data:size=32m,uid=1000,gid=1000,mode=0700\n/,
    );
  });

  it('publishes the web on 127.0.0.1:4010 only, replacing the port of the base file (D-99)', () => {
    expect(COMPOSE).toMatch(/ports: !override\n\s+- 127\.0\.0\.1:4010:8080\n/);
  });

  it('restarts every day the API container of this project, which regenerates the data', () => {
    const project = /^name: (\S+)$/m.exec(COMPOSE)?.[1];
    const service = read('systemd/saas-o-matic-demo-reset.service');
    const timer = read('systemd/saas-o-matic-demo-reset.timer');

    expect(project).toBe('saas-o-matic-demo');
    expect(directives(service)).toContain(`ExecStart=docker restart ${String(project)}-api-1`);
    expect(directives(timer)).toEqual(
      expect.arrayContaining(['OnCalendar=*-*-* 05:00:00', 'Persistent=true']),
    );
  });

  it('D-170 pulls the very images the CI tests and publishes, by the tag of their commit', () => {
    const ci = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
    const ciImage = (name: string): string | undefined =>
      new RegExp(`^\\s+${name}: (\\S+)$`, 'm').exec(ci)?.[1];
    const composeImages = [...COMPOSE.matchAll(/^\s+image: (\S+):\$\{SAAS_O_MATIC_TAG:\?/gm)].map(
      (match) => match[1],
    );

    expect(composeImages).toEqual([ciImage('DEMO_API_IMAGE'), ciImage('DEMO_WEB_IMAGE')]);
    expect(ci).toMatch(/^\s+SAAS_O_MATIC_TAG: sha-\$\{\{ github\.sha \}\}$/m);
  });
});
