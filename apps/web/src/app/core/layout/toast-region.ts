import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastStore } from './toast.store';

/**
 * Live region of the success messages. It is always in the DOM, so screen readers announce each message as it
 * is added (role="status", polite).
 */
@Component({
  selector: 'app-toast-region',
  template: `
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6"
    >
      @for (toast of store.toasts(); track toast.id) {
        <div class="alert alert-success pointer-events-auto w-full max-w-sm bg-surface shadow-raised">
          <svg aria-hidden="true" viewBox="0 0 20 20" class="mt-0.5 size-5 shrink-0 fill-current">
            <path d="M8 13.6 4.4 10l-1.4 1.4L8 16.4l9-9L15.6 6z" />
          </svg>
          <p class="flex-1 font-semibold">{{ toast.message }}</p>
          <button
            type="button"
            class="-m-2 inline-flex size-11 items-center justify-center rounded-sm"
            aria-label="Cerrar aviso"
            (click)="store.dismiss(toast.id)"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 fill-current">
              <path
                d="m10 8.6 4.6-4.6L16 5.4 11.4 10l4.6 4.6-1.4 1.4-4.6-4.6L5.4 16 4 14.6 8.6 10 4 5.4 5.4 4z"
              />
            </svg>
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
