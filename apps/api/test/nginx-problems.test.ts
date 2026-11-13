import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { problemOf } from '../src/http/problem.js';

/** The nginx of the web container, which answers some errors of /api/ itself (D-152, D-158). */
const NGINX_CONF = readFileSync(new URL('../../web/nginx/nginx.conf', import.meta.url), 'utf8');

/** The JSON body of `return <status> '<json>';` in nginx.conf. */
function nginxBody(status: number): unknown {
  const match = new RegExp(`return ${String(status)} '([^']+)';`).exec(NGINX_CONF);
  if (match?.[1] === undefined) throw new Error(`nginx.conf has no return ${String(status)} with a body`);
  return JSON.parse(match[1]);
}

describe('D-158 ADR-009 the Problems nginx writes match the API', () => {
  it('the 413 is the PAYLOAD_TOO_LARGE of the API without its instance', () => {
    const expected: Record<string, unknown> = { ...problemOf({ code: 'PAYLOAD_TOO_LARGE' }, 'unused') };
    delete expected['instance'];

    expect(nginxBody(413)).toEqual(expected);
  });

  it.each([502, 504])('D-152 the %i is SERVICE_UNAVAILABLE with its status and no instance', (status) => {
    expect(nginxBody(status)).toMatchObject({
      type: '/problems/service-unavailable',
      title: 'Service unavailable',
      status,
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(nginxBody(status)).not.toHaveProperty('instance');
  });
});
