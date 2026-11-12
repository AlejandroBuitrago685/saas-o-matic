import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Explicit even though it is the default in Angular 22: signals drive change detection (ADR-011).
    provideZonelessChangeDetection(),
    provideRouter(routes),
  ],
};
