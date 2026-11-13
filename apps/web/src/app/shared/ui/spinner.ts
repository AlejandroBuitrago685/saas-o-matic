import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Activity indicator inside a button or a status line. Decorative: the text next to it says what is going on. */
@Component({
  selector: 'app-spinner',
  template: `
    <svg aria-hidden="true" viewBox="0 0 24 24" class="size-5 animate-spin fill-none stroke-current">
      <circle cx="12" cy="12" r="9" stroke-width="3" class="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke-width="3" stroke-linecap="round" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {}
