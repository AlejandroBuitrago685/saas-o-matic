import { describe, expect, it } from 'vitest';

import { emailBreakSegments } from './email-segments';

describe('D-159 AC-84 the email wraps only at its natural break points', () => {
  it.each([
    ['ana@acme.com', ['ana@', 'acme.', 'com']],
    ['ventas@acme-industrial.es', ['ventas@', 'acme-industrial.', 'es']],
    ['ana.lopez@mail.acme.co.uk', ['ana.', 'lopez@', 'mail.', 'acme.', 'co.', 'uk']],
    ['sin-arroba', ['sin-arroba']],
    ['', []],
  ])('%s → %j', (email, segments) => {
    expect(emailBreakSegments(email)).toEqual(segments);
  });

  it('joined, the segments are always the email as it is', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;

    expect(emailBreakSegments(email).join('')).toBe(email);
  });
});
