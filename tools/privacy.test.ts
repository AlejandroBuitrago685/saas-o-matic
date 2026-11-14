import { existsSync, readFileSync } from 'node:fs';
import { isIPv6 } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hashOf, paragraphsOf } from '../scripts/conversaciones/omissions.mjs';
import { readPrivateFile } from '../scripts/conversaciones/private-terms.mjs';
import {
  checkDeliverables,
  findForbiddenPhrases,
  isDeliverable,
  readReviewed,
} from '../scripts/privacy/check-deliverables.mjs';
import { listRepoFiles } from '../scripts/lib/repo.mjs';
import { REPO_ROOT } from './lint-fixture.js';

/**
 * D-175, D-189: nothing that is delivered describes the private server of the demo.
 * - In the CI: no address nor other host of the author in any deliverable; in the records (conversations and prompts),
 *   no email nor server path either; every mark is the only one; and the registry of reviewed paragraphs is not stale.
 *   These detectors are written apart from the ones of the converter on purpose: if they shared the patterns, a
 *   mistake in a pattern of the converter would also pass this test.
 * - On the author's machine, where the private file exists outside the repository: no private term in any
 *   deliverable, and every paragraph with an alert word read and recorded as safe. The file holds the names to cover,
 *   so it is never in the repository, and the CI cannot run this part.
 */
const DEMO_HOST = 'saas-o-matic.codeserviceapi.es';
const MARK = '[Omitido: detalle del servidor privado]';
const PRIVATE_FILE = join(REPO_ROOT, '..', 'saas-o-matic-privado', 'conversaciones.txt');
const ALLOWED_IPV4_PREFIXES = ['192.0.2.', '198.51.100.', '203.0.113.', '172.30.0.'];
const RECORDS = /^ai-workspace\/(?:conversaciones|prompts)\//;

function isPrivateIpv4(candidate: string): boolean {
  const octets = candidate.split('.').map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  if (candidate === '127.0.0.1' || candidate === '0.0.0.0') return false;
  return !ALLOWED_IPV4_PREFIXES.some((prefix) => candidate.startsWith(prefix));
}

function isPrivateIpv6(candidate: string): boolean {
  const address = candidate.toLowerCase();
  if (!isIPv6(address)) return false;
  return address !== '::1' && address !== '::' && !address.startsWith('2001:db8:');
}

interface Detector {
  kind: string;
  pattern: RegExp;
  isFinding: (match: string) => boolean;
}

/** For every deliverable. */
const ADDRESS_DETECTORS: Detector[] = [
  { kind: 'IP', pattern: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g, isFinding: isPrivateIpv4 },
  {
    kind: 'IP',
    pattern: /(?<![\w:])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:])/gi,
    isFinding: isPrivateIpv6,
  },
  {
    kind: 'host',
    pattern: /\b(?:[a-z0-9-]+\.)+codeservice(?:api)?\.es\b/gi,
    isFinding: (match) => match.toLowerCase() !== DEMO_HOST,
  },
  { kind: 'mark', pattern: /\[omitido(?: \(D-175\))?: [^\]]*\]/gi, isFinding: (match) => match !== MARK },
];

/** Also for the records, which copy what was written in the sessions; the docs name paths of the containers. */
const RECORD_DETECTORS: Detector[] = [
  ...ADDRESS_DETECTORS,
  {
    kind: 'email',
    pattern: /[^\s@<>()"'`[\]]+@[^\s@<>()"'`[\]]+\.[a-z]{2,}/gi,
    isFinding: (match) => !match.toLowerCase().includes('noreply'),
  },
  {
    kind: 'server path',
    pattern: /(?<=^|[\s`'"(=:])\/(?:etc|root|home|var|opt|srv)(?=[/\s`'").,;:]|$)/gm,
    isFinding: () => true,
  },
];

/** Each finding as `<kind>: <what was found>`, in the order of the detectors. */
export function privateDataIn(text: string, detectors: readonly Detector[] = RECORD_DETECTORS): string[] {
  return detectors.flatMap(({ kind, pattern, isFinding }) =>
    [...text.matchAll(pattern)]
      .map(([match]) => match)
      .filter(isFinding)
      .map((match) => `${kind}: ${match}`),
  );
}

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
const deliverables = (): string[] => listRepoFiles().filter(isDeliverable);

function findingsIn(path: string): string[] {
  const detectors = RECORDS.test(path) ? RECORD_DETECTORS : ADDRESS_DETECTORS;
  // The path data of the SVG icons («…41-.34.75.75…») looks like an address and is not one (as in recorrido.test.ts).
  // The same path data, written as strings in the templates of the walkthrough ('M11.5 3.5H6.25a.75.75 …').
  const text = read(path)
    .replace(/\sd="[^"]*"/g, '')
    .replace(/'M[\d\s.,MmLlHhVvCcSsQqTtAaZz-]*'/g, "''");
  return text
    .split('\n')
    .flatMap((line, index) =>
      privateDataIn(line, detectors).map((found) => `${path}:${String(index + 1)} ${found}`),
    );
}

describe('D-189 the privacy detectors', () => {
  it('find an address, an email, a server path, another host of the author and a mark that says what it covers', () => {
    const text = [
      'IPv4 10.1.2.3 and Tailscale 100.101.102.103',
      'IPv6 fe80::1c2b:3a4d and 2a02:4780:1:2::5',
      'mail to alguien@ejemplo.es',
      'the file /etc/nginx/sites-enabled/x.conf and `/home/someone`',
      'the site otro.codeserviceapi.es and www.codeservice.es',
      '[Omitido (D-175): el cortafuegos] and [omitido: IP]',
    ].join('\n');

    expect(privateDataIn(text)).toEqual([
      'IP: 10.1.2.3',
      'IP: 100.101.102.103',
      'IP: fe80::1c2b:3a4d',
      'IP: 2a02:4780:1:2::5',
      'host: otro.codeserviceapi.es',
      'host: www.codeservice.es',
      'mark: [Omitido (D-175): el cortafuegos]',
      'mark: [omitido: IP]',
      'email: alguien@ejemplo.es',
      'server path: /etc',
      'server path: /home',
    ]);
  });

  it('let through what reveals nothing: loopback, documentation ranges, the Docker subnet, noreply, the demo and the mark', () => {
    const text = [
      'listen on 127.0.0.1:4010, 0.0.0.0, [::1] and [::]; examples 192.0.2.1, 198.51.100.2, 203.0.113.7, 2001:db8::1',
      'TRUST_PROXY=loopback,172.30.0.10 in the subnet 172.30.0.0/24; a CSS `::after`',
      'author 73494963+someone@users.noreply.github.com and noreply@anthropic.com',
      'paths apps/var/x, ~/home and https://example.org/etc/x; versions v1.2.3 and 22:31:05',
      `the demo, https://${DEMO_HOST}, and ${MARK}`,
    ].join('\n');

    expect(privateDataIn(text)).toEqual([]);
  });
});

describe('D-189 the deliverables say nothing of the server', () => {
  it('covers the conversations, the prompts, the documentation, the walkthrough and deploy/', () => {
    const files = deliverables();

    expect(files.filter((path) => /^ai-workspace\/conversaciones\/\d{2}-/.test(path))).toHaveLength(11);
    expect(files).toEqual(
      expect.arrayContaining(['README.md', 'GUIA-EVALUADOR.md', 'docs/recorrido/index.html']),
    );
    expect(files.some((path) => path.startsWith('deploy/'))).toBe(true);
  });

  it('has no address, other host of the author or descriptive mark, nor in the records an email or server path', () => {
    expect(deliverables().flatMap(findingsIn)).toEqual([]);
  });

  it('has none of the phrases that say the server has weaknesses or hosts other sites', () => {
    expect(findForbiddenPhrases()).toEqual([]);
  });

  it('records as reviewed only paragraphs that exist today, so that the registry cannot go stale', () => {
    const stale = Object.entries(readReviewed()).flatMap(([path, hashes]) => {
      const present = new Set(
        existsSync(join(REPO_ROOT, path)) ? paragraphsOf(read(path).replace(/\r\n/g, '\n')).map(hashOf) : [],
      );
      return hashes.filter((hash) => !present.has(hash)).map((hash) => `${path} ${hash}`);
    });

    expect(stale).toEqual([]);
  });

  it.skipIf(!existsSync(PRIVATE_FILE))(
    'has no private term and every paragraph with an alert word reviewed (only where the private file exists)',
    () => {
      const { terms, alerts } = readPrivateFile(PRIVATE_FILE, REPO_ROOT);
      const result = checkDeliverables({ terms, alerts, reviewed: readReviewed() });

      expect(result.terms.map(({ file, hash }) => `${file} ${hash}`)).toEqual([]);
      expect(result.unreviewed.map(({ file, hash }) => `${file} ${hash}`)).toEqual([]);
    },
  );
});
