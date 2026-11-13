import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { apiBaseInterceptor } from './core/api/api-base.interceptor';
import { apiErrorInterceptor } from './core/api/api-error.interceptor';
import { ExchangeRatesStore } from './core/currency/exchange-rates.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Explicit even though it is the default in Angular 22: signals drive change detection (ADR-011).
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    // Same-origin `/api` (ADR-012); every failure becomes an ApiError (06-frontend §5). The fetch backend is the
    // default in Angular 22, so `withFetch()` is deprecated and not used.
    provideHttpClient(withInterceptors([apiBaseInterceptor, apiErrorInterceptor])),
    // The rates are asked for on start but not awaited: EUR works from the first moment (spec 05 §4.2).
    provideAppInitializer(() => {
      void inject(ExchangeRatesStore).start();
    }),
  ],
};
