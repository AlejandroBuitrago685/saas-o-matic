/**
 * Problem Details that **nginx** sends, not the API, when the API does not answer (04-contrato-api §2.2, D-152, AC-85):
 * `502` if it cannot connect and `504` if the API takes too long. It has no `instance`, because the request never
 * reached the API. Only types: the body is written in `apps/web/nginx/nginx.conf`, and the web reads it by hand.
 */
export type GatewayErrorCode = 'SERVICE_UNAVAILABLE';

export interface GatewayProblem {
  readonly type: '/problems/service-unavailable';
  readonly title: 'Service unavailable';
  readonly status: 502 | 504;
  readonly detail: string;
  readonly code: GatewayErrorCode;
}
