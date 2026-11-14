// @ts-check
/**
 * The icons of the walkthrough: authored SVG paths on a 20 × 20 grid, one stroke weight, drawn in `currentColor`.
 * They are decorative (`aria-hidden`): every control that carries one also has a text name.
 */
import { raw } from '../html.mjs';

const PATHS = /** @type {const} */ ({
  arrow: 'M4 10h11M11 5.5 15.5 10 11 14.5',
  external:
    'M11.5 4.5h4v4M15.5 4.5 9 11M13.5 11.5v3.25c0 .41-.34.75-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5c0-.41.34-.75.75-.75H8.5',
  file: 'M11.5 3.5H6.25a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75V6.5l-3-3Zm0 0v3h3',
  folder:
    'M3.5 6.25c0-.41.34-.75.75-.75h3.5l1.5 1.75h6.5c.41 0 .75.34.75.75v6.75c0 .41-.34.75-.75.75H4.25a.75.75 0 0 1-.75-.75V6.25Z',
  test: 'M8 3.5v4.75L4.4 14.6a1.25 1.25 0 0 0 1.1 1.9h9a1.25 1.25 0 0 0 1.1-1.9L12 8.25V3.5M7 3.5h6M6.25 12.5h7.5',
  check: 'M4.5 10.5 8.25 14 15.5 6',
  search: 'M8.75 14a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5ZM12.5 12.5l4 4',
  play: 'M6.5 4.75v10.5c0 .6.66.96 1.16.63l7.9-5.25a.75.75 0 0 0 0-1.26l-7.9-5.25a.75.75 0 0 0-1.16.63Z',
  code: 'M7 6 3 10l4 4M13 6l4 4-4 4',
  shield: 'M10 3.25 4.5 5.25v4.5c0 3.4 2.3 5.9 5.5 7 3.2-1.1 5.5-3.6 5.5-7v-4.5L10 3.25Z',
  idcard:
    'M3.5 5.75c0-.41.34-.75.75-.75h11.5c.41 0 .75.34.75.75v8.5c0 .41-.34.75-.75.75H4.25a.75.75 0 0 1-.75-.75v-8.5ZM6 12.5c.4-1.1 1.2-1.75 2-1.75s1.6.65 2 1.75M8 9.25a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM12 8h2.25M12 10.5h2.25',
  user: 'M10 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM4.75 16c.6-2.6 2.75-4.25 5.25-4.25S14.65 13.4 15.25 16',
  sliders: 'M4 6h5M13 6h3M4 14h2M10 14h6M11 4v4M8 12v4',
  percent:
    'M15 5 5 15M6.75 8a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM13.25 14.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z',
  currency: 'M4 7.5h10.5L12 5M16 12.5H5.5L8 15',
  save: 'M5.25 3.5h7.5l3 3v9.75c0 .41-.34.75-.75.75H5.25a.75.75 0 0 1-.75-.75V4.25c0-.41.34-.75.75-.75ZM7 3.5v3.75h5V3.5M7 17v-4.5h6V17',
});

/** @typedef {keyof typeof PATHS} IconName */

/**
 * @param {IconName} name
 * @returns {import('../html.mjs').SafeHtml}
 */
export function icon(name) {
  return raw(
    `<svg class="icon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">` +
      `<path d="${PATHS[name]}"/></svg>`,
  );
}
