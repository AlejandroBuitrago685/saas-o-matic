import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/**
 * Application shell. No component styles (styles / styleUrl) are allowed: Tailwind utilities only,
 * so the CSP can keep `style-src 'self'` (ADR-011, RNF-SEC-06).
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly appName = 'SaaS-O-Matic';
}
