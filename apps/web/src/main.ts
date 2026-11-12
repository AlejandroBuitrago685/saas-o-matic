import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// A bootstrap failure becomes an unhandled rejection, which the browser reports on its own;
// there is no console logging in application code (CLAUDE.md).
void bootstrapApplication(App, appConfig);
