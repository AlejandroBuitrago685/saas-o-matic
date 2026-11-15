import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Icon } from '../../shared/ui/icon';
import { ToastStore } from './toast.store';

/**
 * Live region of the success messages. It is always in the DOM, so screen readers announce each message as it
 * is added (role="status", polite).
 */
@Component({
  selector: 'app-toast-region',
  imports: [Icon],
  template: `
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6"
    >
      @for (toast of store.toasts(); track toast.id) {
        <div class="alert alert-success pointer-events-auto w-full max-w-sm bg-surface shadow-raised">
          <app-icon name="circle-check" class="mt-0.5 size-5" />
          <p class="flex-1 font-semibold">{{ toast.message }}</p>
          <button
            type="button"
            class="-m-2 inline-flex size-11 items-center justify-center rounded-sm"
            aria-label="Cerrar aviso"
            (click)="store.dismiss(toast.id)"
          >
            <app-icon name="x" class="size-4" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastRegion {
  protected readonly store = inject(ToastStore);
}
