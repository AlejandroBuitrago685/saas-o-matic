import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Skeleton of a section while it loads (spec 05: no view is ever blank, CL-51). Screen readers hear the label
 * instead of empty boxes.
 */
@Component({
  selector: 'app-loading-block',
  template: `
    <div
      class="flex flex-col gap-3"
      [attr.role]="announce() ? 'status' : null"
      [attr.aria-busy]="announce() || null"
      [attr.aria-hidden]="announce() ? null : true"
    >
      @if (announce()) {
        <span class="sr-only">{{ label() }}</span>
      }
      @for (line of lineIds(); track line) {
        <div class="skeleton h-4" [class.w-2/3]="line % 2 === 1" [class.w-full]="line % 2 === 0"></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBlock {
  readonly label = input('Cargando…');
  readonly lines = input(3);
  /** False when a parent already announces the loading: one status region per view, not one per box. */
  readonly announce = input(true);

  protected readonly lineIds = computed(() => Array.from({ length: this.lines() }, (_, index) => index));
}
