import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { openApiDocument } from '../scripts/openapi-document.js';

const VERSIONED = new URL('../openapi.json', import.meta.url);

describe('D-110 the versioned OpenAPI document matches the schemas', () => {
  it('apps/api/openapi.json is up to date (regenerate it with `npm run openapi`)', async () => {
    const generated = await openApiDocument();

    expect(readFileSync(VERSIONED, 'utf8')).toBe(generated);
  });

  it('documents the routes of the contract and nothing else', async () => {
    const document = JSON.parse(await openApiDocument()) as { paths: Record<string, unknown> };

    expect(Object.keys(document.paths).sort()).toEqual(['/catalog', '/health']);
  });
});
