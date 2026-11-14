import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppFooter } from './core/layout/app-footer';
import { AppHeader } from './core/layout/app-header';
import { DemoBanner } from './core/layout/demo-banner';
import { ToastRegion } from './core/layout/toast-region';

/**
 * Application shell. No component styles (styles / styleUrl) are allowed: Tailwind utilities and the global
 * classes of `styles/` only, so the CSP can keep `style-src 'self'` (ADR-011, RNF-SEC-06, D-125).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DemoBanner, AppHeader, AppFooter, ToastRegion],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
