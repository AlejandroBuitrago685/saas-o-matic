import type { HttpInterceptorFn } from '@angular/common/http';

/** Prefix of the API on the web's own origin (ADR-012): nginx and the dev server proxy it to the API. */
export const API_PREFIX = '/api';

/**
 * Stores and resources request the API with its own routes (`/customers/…`, as in the contract); this sends them
 * to `/api/…`. Absolute and protocol-relative URLs are left alone.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (request, next) => {
  const isApiRoute = request.url.startsWith('/') && !request.url.startsWith('//');
  return next(isApiRoute ? request.clone({ url: `${API_PREFIX}${request.url}` }) : request);
};
