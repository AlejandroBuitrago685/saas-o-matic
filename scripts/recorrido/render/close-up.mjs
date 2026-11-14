// @ts-check
/** The picture of a step of the flow: a close-up of what matters, linked to the full screenshot (D-183). */
import { markup } from '../html.mjs';

/** The pixel size of each picture of `docs/capturas`, so the page reserves its box before it loads. */
/** @typedef {Readonly<Record<string, { width: number, height: number }>>} CaptureSizes */

/**
 * @param {import('../content/flow.mjs').FlowStep} step
 * @param {CaptureSizes} sizes
 */
export function renderCloseUp(step, sizes) {
  const { closeUp, full, alt } = step.capture;
  const size = sizes[closeUp];
  if (size === undefined || sizes[full] === undefined)
    throw new Error(`renderCloseUp: missing capture of ${step.id}`);
  // The close-ups are taken at twice the pixel density: their box is half their pixel size.
  return markup`<figure class="shot">
    <img
      src="../capturas/${closeUp}"
      alt="${alt}"
      width="${size.width / 2}"
      height="${size.height / 2}"
      loading="lazy"
      decoding="async"
    />
    <figcaption><a href="../capturas/${full}">Ver la captura completa</a></figcaption>
  </figure>`;
}
