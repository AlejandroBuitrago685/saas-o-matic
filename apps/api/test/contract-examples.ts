import { readFileSync } from 'node:fs';

const CONTRACT = new URL('../../../ai-workspace/02-especificacion/04-contrato-api.md', import.meta.url);

/**
 * The JSON examples of a section of 04-contrato-api.md, in the order they appear, read from the document itself so
 * the tests and the contract cannot drift apart. `from` and `until` are the headings that bound the section.
 */
export function contractExamples(from: string, until: string): unknown[] {
  const text = readFileSync(CONTRACT, 'utf8');
  const section = text.slice(text.indexOf(from), text.indexOf(until));
  return [...section.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
    ([, json]) => JSON.parse(json ?? '') as unknown,
  );
}

/** `[request, 201 response]` of §3.2 (POST /customers). */
export function customerExamples(): {
  readonly request: Record<string, unknown>;
  readonly created: Record<string, unknown>;
} {
  const [request, created] = contractExamples('### 3.2', '### 3.3') as Record<string, unknown>[];
  if (request === undefined || created === undefined) throw new Error('§3.2 of the contract has no examples');
  return { request, created };
}

/** `[request, 201 response]` of §3.6 (POST /simulations). */
export function simulationExamples(): {
  readonly request: Record<string, unknown>;
  readonly created: Record<string, unknown>;
} {
  const [request, created] = contractExamples('### 3.6', '### 3.7') as Record<string, unknown>[];
  if (request === undefined || created === undefined) throw new Error('§3.6 of the contract has no examples');
  return { request, created };
}
