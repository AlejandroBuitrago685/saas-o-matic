import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Error of a section with its «Reintentar» button (spec 05, RNF-08). Icon + text + border, never colour alone. */
@Component({
  selector: 'app-error-state',
  template: `
    <div role="alert" class="alert alert-danger">
      <svg aria-hidden="true" viewBox="0 0 20 20" class="mt-0.5 size-5 shrink-0 fill-current">
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m-1 4h2v5H9zm0 6h2v2H9z" />
      </svg>
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
