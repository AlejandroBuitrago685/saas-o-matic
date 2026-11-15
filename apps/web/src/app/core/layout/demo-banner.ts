import { ChangeDetectionStrategy, Component, inject, InjectionToken } from '@angular/core';

import { Icon } from '../../shared/ui/icon';
import { DEMO_BUILD } from './demo-build';

/** Whether this build is the public demo (D-169), decided when compiling. Injected so the tests can choose. */
export const IS_DEMO_BUILD = new InjectionToken<boolean>('IS_DEMO_BUILD', {
  providedIn: 'root',
  factory: () => DEMO_BUILD,
});

/**
 * The notice of the public demo (spec 05 §2, RNF-SEC-20, AC-61), on top of every view. It cannot be dismissed, and it
 * scrolls with the page instead of sticking to the header, which at 360 px would leave too little screen (D-168).
 */
@Component({
  selector: 'app-demo-banner',
  imports: [Icon],
  template: `
    @if (isDemoBuild) {
      <aside
        aria-label="Aviso de demostración"
        class="border-b border-warning-fg bg-warning-bg px-4 py-2.5 text-small text-warning-fg sm:px-6"
      >
        <div class="mx-auto flex max-w-app items-start gap-2 sm:justify-center">
          <app-icon name="triangle-alert" class="mt-0.5 size-5" />
          <p>
            <strong class="font-bold">Entorno de demostración:</strong> los datos son ficticios y se borran
            periódicamente. No introduzcas datos reales.
          </p>
        </div>
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoBanner {
  protected readonly isDemoBuild = inject(IS_DEMO_BUILD);
}
