/** A problem in business configuration, with the path of the datum that fails (AC-07, RNF-SEC-12). */
export interface ConfigIssue {
  readonly path: string;
  readonly message: string;
}
