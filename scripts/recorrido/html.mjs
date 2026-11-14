// @ts-check
/**
 * A minimal HTML builder for the evaluator walkthrough (D-183): every interpolated value is escaped unless it is
 * already `SafeHtml`, so no text read from the repository can inject markup into the page.
 */

const ESCAPES = /** @type {const} */ ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

/** Markup that is already escaped (built by `markup` or `raw`). */
export class SafeHtml {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

/**
 * @param {string} text
 * @returns {string} the text with the five HTML special characters escaped
 */
export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[/** @type {keyof typeof ESCAPES} */ (character)]);
}

/** @typedef {SafeHtml | string | number | boolean | null | undefined | readonly unknown[]} Interpolation */

/**
 * @param {unknown} value an `Interpolation`, or an array of them
 * @returns {string}
 */
function render(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(String(value));
}

/**
 * Tagged template: `markup\`<p>${text}</p>\`` escapes `text`; arrays are joined; null, undefined and false vanish.
 * Not called `html` on purpose: Prettier would reformat the markup inside every template.
 * @param {TemplateStringsArray} strings
 * @param {...Interpolation} values
 * @returns {SafeHtml}
 */
export function markup(strings, ...values) {
  return new SafeHtml(strings.reduce((out, part, index) => out + render(values[index - 1]) + part));
}

/**
 * Markup written in this repository's own code (an authored SVG icon, never text read from a file).
 * @param {string} trusted
 * @returns {SafeHtml}
 */
export function raw(trusted) {
  return new SafeHtml(trusted);
}
