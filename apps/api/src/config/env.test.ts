import { describe, expect, it } from 'vitest';

import { loadConfig } from './env.js';

function errorOf(env: Record<string, string>): string {
  const result = loadConfig(env);
  return result.ok ? '' : result.error;
}

describe('AC-55 the configuration is validated at startup (RNF-SEC-12, 03-backend §5)', () => {
  it('uses the defaults of 03-backend §5 when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      ok: true,
      value: {
        environment: 'development',
        host: '127.0.0.1',
        port: 3000,
        databasePath: './data/saas-o-matic.db',
        corsOrigins: ['http://localhost:4200'],
        rateLimit: { perMinute: 100, writesPerMinute: 20 },
        trustProxy: false,
        logLevel: 'info',
        isDemoMode: false,
      },
    });
  });

  it('reads valid values, and normalizes each CORS origin', () => {
    const result = loadConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '8081',
      CORS_ORIGINS: 'https://demo.example.com, http://localhost:4200/',
      RATE_LIMIT_PER_MINUTE: '60',
      RATE_LIMIT_WRITES_PER_MINUTE: '5',
      TRUST_PROXY: '172.30.0.0/24',
      DEMO_MODE: 'true',
    });

    expect(result.ok && result.value).toMatchObject({
      environment: 'production',
      host: '0.0.0.0',
      port: 8081,
      corsOrigins: ['https://demo.example.com', 'http://localhost:4200'],
      rateLimit: { perMinute: 60, writesPerMinute: 5 },
      trustProxy: ['172.30.0.0/24'],
      isDemoMode: true,
    });
  });

  it.each([
    ['PORT', { PORT: 'abc' }],
    ['PORT', { PORT: '70000' }],
    ['HOST', { HOST: 'not an ip' }],
    ['LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: '*' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: 'not a url' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: 'https://demo.example.com/path' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: 'ftp://files.example.com' }],
    ['CORS_ORIGINS', { CORS_ORIGINS: ' , ' }],
    ['RATE_LIMIT_PER_MINUTE', { RATE_LIMIT_PER_MINUTE: '0' }],
    ['DEMO_MODE', { DEMO_MODE: 'yes' }],
    ['DATABASE_PATH', { DATABASE_PATH: ':memory:' }],
  ])('rejects an invalid %s and names the variable', (variable, env) => {
    expect(errorOf(env)).toContain(`${variable}:`);
  });

  it('accepts an in-memory database only in tests', () => {
    expect(loadConfig({ NODE_ENV: 'test', DATABASE_PATH: ':memory:' }).ok).toBe(true);
  });

  it('never repeats the rejected value in the message (it could be a secret one day)', () => {
    expect(errorOf({ CORS_ORIGINS: 'https://secret.example.com/x' })).not.toContain('secret');
  });
});

describe('D-173 AC-61 the demo never starts with more than 5 writes per minute and IP (RNF-SEC-20)', () => {
  it('rejects DEMO_MODE with the default 20 writes, and names the variable', () => {
    expect(errorOf({ DEMO_MODE: 'true' })).toContain('RATE_LIMIT_WRITES_PER_MINUTE:');
  });

  it.each(['5', '1'])('accepts DEMO_MODE with %s writes per minute', (writes) => {
    expect(loadConfig({ DEMO_MODE: 'true', RATE_LIMIT_WRITES_PER_MINUTE: writes }).ok).toBe(true);
  });

  it('leaves the writes of the internal tool alone', () => {
    expect(loadConfig({ RATE_LIMIT_WRITES_PER_MINUTE: '50' }).ok).toBe(true);
  });
});

describe('D-105 TRUST_PROXY is false or the addresses of the proxies, never true nor a hop count', () => {
  it.each([
    ['false', false],
    ['172.30.0.0/24', ['172.30.0.0/24']],
    ['127.0.0.1, 172.30.0.2', ['127.0.0.1', '172.30.0.2']],
    ['loopback,fd00::/8', ['loopback', 'fd00::/8']],
  ])('accepts %s', (value, expected) => {
    const result = loadConfig({ TRUST_PROXY: value });

    expect(result.ok && result.value.trustProxy).toEqual(expected);
  });

  it.each([
    'true',
    '2',
    '*',
    ' , ',
    '0.0.0.0/0',
    '::/0',
    '10.0.0.0/33',
    '10.0.0.0/8/1',
    '10.0.0.0/+8',
    '300.1.1.1',
    'proxy.example.com',
    'uniquelocal',
    'linklocal',
  ])('rejects %s', (value) => {
    expect(errorOf({ TRUST_PROXY: value })).toContain('TRUST_PROXY:');
  });
});
