import { describe, expect, it } from 'vitest';

import { loadServerConfig } from './server-config.js';

describe('AC-55 (P0) server configuration is validated at startup', () => {
  it('uses safe defaults when nothing is set', () => {
    const result = loadServerConfig({});

    expect(result).toEqual({ ok: true, value: { host: '127.0.0.1', port: 3000, logLevel: 'info' } });
  });

  it('reads valid values from the environment', () => {
    const result = loadServerConfig({ HOST: '0.0.0.0', PORT: '8081', LOG_LEVEL: 'warn' });

    expect(result).toEqual({ ok: true, value: { host: '0.0.0.0', port: 8081, logLevel: 'warn' } });
  });

  it.each([
    ['PORT', { PORT: 'abc' }],
    ['PORT', { PORT: '0' }],
    ['PORT', { PORT: '70000' }],
    ['LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
  ])('rejects an invalid %s and names the variable', (variable, env) => {
    const result = loadServerConfig(env);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(variable);
    }
  });
});
