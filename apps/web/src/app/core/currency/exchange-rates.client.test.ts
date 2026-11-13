import { describe, expect, it, vi } from 'vitest';

import { REFERENCE_RATES_PAYLOAD } from '../testing/exchange-rates.fixture';
import { EXCHANGE_RATES_URL, fetchExchangeRates } from './exchange-rates.client';

function answering(response: Response): typeof fetch {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function failing(error: unknown): typeof fetch {
  return vi.fn<typeof fetch>().mockRejectedValue(error);
}

/** A 200 whose body is cut by the timeout of the request while it is being read. */
function stalledBody(): Response {
  const body = new ReadableStream({
    start: (controller) => {
      controller.error(new DOMException('signal timed out', 'TimeoutError'));
    },
  });
  return new Response(body, { status: 200 });
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('D-148 request for the rates (spec 05 §4.2)', () => {
  it('asks the provider once, with a 5 s limit, without cookies, referrer or HTTP cache', async () => {
    const fetchFn = answering(json(REFERENCE_RATES_PAYLOAD));

    const result = await fetchExchangeRates(fetchFn);

    expect(result.ok && result.value.payload).toEqual(REFERENCE_RATES_PAYLOAD);
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(
      EXCHANGE_RATES_URL,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }),
    );
    const init = vi.mocked(fetchFn).mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['CL-30: a network error', failing(new TypeError('Failed to fetch')), 'NETWORK'],
    ['CL-30: the 5 s timeout', failing(new DOMException('signal timed out', 'TimeoutError')), 'TIMEOUT'],
    ['anything else thrown', failing('boom'), 'NETWORK'],
    ['CL-30: a 429', answering(json({}, 429)), 'RATE_LIMITED'],
    ['CL-30: a 500', answering(json({}, 500)), 'HTTP'],
    ['a 404', answering(json({}, 404)), 'HTTP'],
    [
      'CL-29: a 200 with "result": "error"',
      answering(json({ result: 'error', 'error-type': 'x' })),
      'INVALID_RESPONSE',
    ],
    ['a 200 whose body is not JSON', answering(new Response('<html>', { status: 200 })), 'INVALID_RESPONSE'],
    ['review P3: the 5 s timeout while reading the body', answering(stalledBody()), 'TIMEOUT'],
  ] as const)('%s → %s', async (_case, fetchFn, failure) => {
    expect(await fetchExchangeRates(fetchFn)).toEqual({ ok: false, error: failure });
  });
});
