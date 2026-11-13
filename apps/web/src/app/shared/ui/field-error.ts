import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ReadonlyFieldState } from '@angular/forms/signals';

/**
 * Whether a field shows its error: after leaving it or after submitting (spec 05 §3.2), never while the user is
 * still typing for the first time.
 */
export function isShowingError(state: ReadonlyFieldState<unknown>): boolean {
  return state.touched() && state.invalid();
}

/** First error of a Signal Forms field, linked to its control through `aria-describedby` (RNF-13). */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message(); as text) {
      <p [id]="errorId()" class="field-error">{{ text }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  readonly state = input.required<ReadonlyFieldState<unknown>>();
  readonly errorId = input.required<string>();

  protected readonly message = computed(() => {
    const state = this.state();
    return isShowingError(state) ? (state.errors()[0]?.message ?? null) : null;
  });
}
