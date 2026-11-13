/**
 * What the e2e tests add to the `window` of the page under test, typed once (instead of a cast in each place).
 * Only the tests set them: the application never reads them.
 */
declare global {
  interface Window {
    /** Exposed by the CSP guard (`fixtures/test.ts`): reports a violation to Node. */
    __reportCspViolation?: (text: string) => void;
    /** Set by the AC-90 probe (`specs/simulator.spec.ts`): milliseconds until the total changed. */
    __latency?: Promise<number>;
  }
}

export {};
