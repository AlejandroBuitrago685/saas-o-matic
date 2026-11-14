import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './lint-fixture.js';

const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

/**
 * The instructions of a Dockerfile, as Docker reads them: comment lines dropped first (a comment never continues onto
 * the next line), then continuation lines joined. Keywords are not case-sensitive.
 */
const instructions = (dockerfile: string): string[] =>
  dockerfile
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')
    .replaceAll(/\\\n\s*/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

const isInstruction = (keyword: string) => (line: string) => new RegExp(`^${keyword}\\s`, 'i').test(line);

/** The instructions of the last stage: the image that is run and published. */
function runtimeStage(dockerfile: string): string[] {
  const all = instructions(dockerfile);
  return all.slice(all.findLastIndex(isInstruction('FROM')) + 1);
}

/** The labels the last stage declares, as key → value. */
const labels = (dockerfile: string): Map<string, string> =>
  new Map(
    runtimeStage(dockerfile)
      .filter(isInstruction('LABEL'))
      .flatMap((line) => [...line.matchAll(/([\w.-]+)="([^"]*)"/g)])
      .map((match): [string, string] => [match[1] ?? '', match[2] ?? '']),
  );

const OCI = 'org.opencontainers.image';
const API = read('apps/api/Dockerfile');
const WEB = read('apps/web/Dockerfile');
const CI = read('.github/workflows/ci.yml');

/**
 * The labels of the nginx base of the web image, read with `docker image inspect` from the digest below. An image
 * inherits every label of its base, so all of them must be declared again; when the base changes, read them again.
 */
const NGINX_BASE_DIGEST = 'sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03';
const NGINX_BASE_LABELS = [
  'maintainer',
  `${OCI}.created`,
  `${OCI}.description`,
  `${OCI}.licenses`,
  `${OCI}.revision`,
  `${OCI}.source`,
  `${OCI}.title`,
  `${OCI}.url`,
  `${OCI}.version`,
];
/** The labels that change with every build: the CI fills them through build arguments. */
const BUILD_LABELS = {
  source: 'OCI_SOURCE',
  url: 'OCI_SOURCE',
  revision: 'OCI_REVISION',
  version: 'OCI_VERSION',
  created: 'OCI_CREATED',
};

describe('D-176 OCI labels of the published images (GHCR shows them on the package page)', () => {
  it('the web image declares again every label of its nginx base, so it never describes itself as nginx', () => {
    expect(WEB).toContain(`nginxinc/nginx-unprivileged:1.30.6-alpine3.24@${NGINX_BASE_DIGEST}`);
    expect([...labels(WEB).keys()]).toEqual(expect.arrayContaining(NGINX_BASE_LABELS));
    expect(labels(WEB).get(`${OCI}.licenses`)).toBe('');
  });

  it.each([
    ['api', API, 'saas-o-matic-api'],
    ['web', WEB, 'saas-o-matic-web'],
  ])('the %s image has a title and a description of its own', (_name, dockerfile, title) => {
    expect(labels(dockerfile).get(`${OCI}.title`)).toBe(title);
    expect(labels(dockerfile).get(`${OCI}.description`)).toMatch(/^.{20,}$/);
  });

  it.each([
    ['api', API],
    ['web', WEB],
  ])(
    'the %s image takes the labels of each build from build arguments of its last stage',
    (_name, dockerfile) => {
      const stage = runtimeStage(dockerfile);
      for (const [label, argument] of Object.entries(BUILD_LABELS)) {
        expect(labels(dockerfile).get(`${OCI}.${label}`), label).toBe(`\${${argument}}`);
        expect(stage, argument).toContainEqual(
          expect.stringMatching(new RegExp(`^ARG\\s.*\\b${argument}=""`, 'i')),
        );
      }
    },
  );

  it('D-170 the CI passes those build arguments to both images it publishes', () => {
    const builds = CI.split('\n').filter((line) => line.includes('docker build "${metadata[@]}"'));

    expect(builds).toHaveLength(2);
    expect(CI).toContain('--build-arg "OCI_SOURCE=https://github.com/${GITHUB_REPOSITORY}"');
    expect(CI).toContain('--build-arg "OCI_REVISION=${GITHUB_SHA}"');
    expect(CI).toContain('--build-arg "OCI_VERSION=${SAAS_O_MATIC_TAG}"');
    expect(CI).toContain('--build-arg "OCI_CREATED=$(git log -1 --format=%cI)"');
  });
});
