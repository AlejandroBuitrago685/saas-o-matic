import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The separator between the parts of a tier label: «Tramo 2 · usuarios 11–50 · 5 × 8,00 €». */
const SEPARATOR = ' · ';

/**
 * A tier label (`tierLabel`, spec 05 §3.4), with the tier in bold, that never leaves a «·» at the end of a line
 * (D-191). Where its card is narrow, the quantity and price go to a line of their own and the separator before them
 * is kept only for screen readers; with room (a container query on the card), it is one line. The parts never break
 * inside, and the text is the same label, so what screen readers and the tests read does not change.
 */
@Component({
  selector: 'app-tier-label',
  template: `
    <span class="font-semibold whitespace-nowrap text-ink">{{ parts().head }}</span>
    @for (part of parts().middle; track $index) {
      {{ separator }} <span class="whitespace-nowrap">{{ part }}</span>
    }
    @if (parts().last; as last) {
      <span class="sr-only @min-[24rem]:not-sr-only">{{ spacedSeparator }}</span>
      <span class="block whitespace-nowrap @min-[24rem]:inline">{{ last }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierLabel {
  readonly label = input.required<string>();

  protected readonly separator = SEPARATOR.trim();
  /** With its spaces: Angular drops the whitespace between two elements, and the label must keep them. */
  protected readonly spacedSeparator = SEPARATOR;
  protected readonly parts = computed(() => {
    const [head = '', ...rest] = this.label().split(SEPARATOR);
    return { head, middle: rest.slice(0, -1), last: rest.at(-1) };
  });
}
