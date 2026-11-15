import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from './icon';

/** Error of a section with its «Reintentar» button (spec 05, RNF-08). Icon + text + border, never colour alone. */
@Component({
  selector: 'app-error-state',
  imports: [Icon],
  template: `
    <div role="alert" class="alert alert-danger">
      <app-icon name="circle-alert" class="mt-0.5 size-5" />
      <div class="flex flex-col items-start gap-3">
        <p class="font-semibold">{{ message() }}</p>
        @if (canRetry()) {
          <button type="button" class="btn btn-secondary" (click)="retry.emit()">Reintentar</button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly canRetry = input(true);
  readonly retry = output();
}
