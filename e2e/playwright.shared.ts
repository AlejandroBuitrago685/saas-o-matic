import { devices, type PlaywrightTestConfig } from '@playwright/test';

const isCi = process.env['CI'] !== undefined;

/**
 * What the two targets of the e2e share (03-arquitectura/07-tests §1.3, D-68), in Chromium. No retries: a test that
 * only passes on a second attempt is a failure to investigate, and its trace is kept.
 */
export const SHARED_CONFIG = {
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
} satisfies PlaywrightTestConfig;
