import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName } from './icon-paths';

/**
 * A decorative icon of the Lucide set (D-191, `icon-paths.ts`). Inline SVG, so no request and nothing for the CSP to
 * allow. It never carries meaning on its own: the text next to it does, so it is hidden from screen readers. Its size
 * comes from the classes of the host (`<app-icon name="users" class="size-5" />`), and its colour from the text colour.
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      class="block size-full"
    >
      @for (path of paths(); track $index) {
        <svg:path [attr.d]="path" />
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();

  protected readonly paths = computed((): readonly string[] => ICON_PATHS[this.name()]);
}
