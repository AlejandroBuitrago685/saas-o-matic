import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MAX_SLIDER_POSITION, MIN_SLIDER_POSITION } from '@saas-o-matic/domain';

import { formatInteger } from '../../shared/format/integer.pipe';

/** Positions moved by Re Pág / Av Pág (spec 05 §3.4.1): browsers would move a tenth of the range instead. */
const PAGE_STEP = 10;

/**
 * Users slider over the scale of D-05/D-49 (positions 0–279). A native range input: arrows move one position and
 * Home/End go to the ends. Screen readers hear «{n} usuarios» with the real value of the numeric field, never the
 * position (D-48, Must).
 */
@Component({
  selector: 'app-users-slider',
  template: `
    <input
      type="range"
      class="range"
      step="1"
      [min]="min"
      [max]="max"
      [value]="position()"
      [attr.aria-labelledby]="labelledBy()"
      [attr.aria-valuetext]="valueText()"
      (input)="onInput($event)"
      (keydown)="onKeydown($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersSlider {
  readonly position = input.required<number>();
  readonly users = input.required<number>();
  readonly labelledBy = input.required<string>();
  readonly positionChange = output<number>();

  // Bound before [value], so the browser never clamps the position to its default 0–100 range.
  protected readonly min = MIN_SLIDER_POSITION;
  protected readonly max = MAX_SLIDER_POSITION;
  protected readonly valueText = computed(() => `${formatInteger(this.users())} usuarios`);

  protected onInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.positionChange.emit(Number(event.target.value));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const direction = event.key === 'PageUp' ? 1 : event.key === 'PageDown' ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const target = this.position() + direction * PAGE_STEP;
    this.positionChange.emit(Math.min(MAX_SLIDER_POSITION, Math.max(MIN_SLIDER_POSITION, target)));
  }
}
