import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApiTestApp, type TestApp } from '../../test/build-test-app.js';
import { expectProblem } from '../../test/expect-response.js';
import { NotFoundError } from '../shared/app-error.js';
import { problemResponses } from '../shared/problem-responses.js';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await buildApiTestApp({
    routes: (app) => {
      app.get(
        '/__test/documented/:id',
        {
          schema: {
            params: z.strictObject({ id: z.uuid() }),
            response: {
              200: z.object({ ok: z.boolean() }),
              ...problemResponses('VALIDATION_ERROR', 'NOT_FOUND'),
            },
          },
        },
        () => {
          throw new NotFoundError();
        },
      );
    },
  });
});

afterAll(async () => {
  await testApp.close();
});

describe('RNF-SEC-17 the errors of a route are documented without changing what the handler sends', () => {
  it('a 404 declared in the schema keeps the RFC 9457 body and content type of the error handler', async () => {
    const response = await testApp.app.inject({
      method: 'GET',
      url: '/__test/documented/019a7a3c-0000-7000-8000-000000000001',
    });

    expectProblem(response, 'NOT_FOUND');
    expect(response.json()).toMatchObject({ type: '/problems/not-found', title: 'Resource not found' });
  });

  it('a 400 declared in the schema keeps its field errors', async () => {
    const response = await testApp.app.inject({ method: 'GET', url: '/__test/documented/abc' });

    expectProblem(response, 'VALIDATION_ERROR', [
      { location: 'path', pointer: '/id', code: 'INVALID_FORMAT' },
    ]);
  });

  it('the OpenAPI document lists each declared status; the errors are application/problem+json', () => {
    const document = testApp.app.swagger() as {
      paths: Record<string, { get: { responses: Record<string, { content: Record<string, unknown> }> } }>;
    };
    const responses = document.paths['/__test/documented/{id}']?.get.responses ?? {};
    const mediaTypes = (status: string): string[] => Object.keys(responses[status]?.content ?? {});

    expect(Object.keys(responses).sort()).toEqual(['200', '400', '404']);
    expect(mediaTypes('200')).toEqual(['application/json']);
    expect(mediaTypes('400')).toEqual(['application/problem+json']);
    expect(mediaTypes('404')).toEqual(['application/problem+json']);
  });
});
