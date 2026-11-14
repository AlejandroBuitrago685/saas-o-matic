// @ts-check
/**
 * The reading routes of 5, 15 and 60 minutes (D-183): the lists of GUIA-EVALUADOR.md as checklists, with the times
 * measured in the clean clone of P12 next to each command. The page script remembers the ticks in this browser.
 */
import { markup } from '../html.mjs';
import { inlineMarkdown } from '../inline-markdown.mjs';
import { githubUrl } from '../repo-links.mjs';
import { DIARY_FILE } from '../sources/workflow.mjs';
import { GUIDE_FILE } from '../sources/guide.mjs';

/**
 * @param {readonly import('../sources/workflow.mjs').MeasuredStep[]} steps
 * @returns {Map<string, string>} command → its measured time; a row that times two commands («37 s y 1 s») is split
 */
export function commandTimes(steps) {
  /** @type {Map<string, string>} */
  const times = new Map();
  for (const { step, time } of steps) {
    const commands = [...step.matchAll(/`([^`]+)`/g)].map(([, command = '']) => command);
    const parts = time.split(' y ');
    commands.forEach((command, index) =>
      times.set(command, parts.length === commands.length ? (parts[index] ?? time) : time),
    );
  }
  return times;
}

/**
 * @param {string} text an item or a command
 * @param {Map<string, string>} times
 * @returns {string | undefined} the measured time of the command the item is about: the command itself, an item that
 * starts with it, or a short lead ending in a colon followed by it («Opcional, con Docker: `docker compose …`»). An
 * item that only mentions a command in passing gets no time.
 */
function timeOf(text, times) {
  const lead = /^(?:[^`:]*:\s*)?`([^`]+)`/.exec(text)?.[1];
  return times.get(text) ?? (lead === undefined ? undefined : times.get(lead));
}

/**
 * @param {object} check
 * @param {string} check.id
 * @param {import('../html.mjs').SafeHtml} check.label
 * @param {string | undefined} check.time
 * @param {import('../html.mjs').SafeHtml | string} [check.children]
 */
function renderCheck({ id, label, time, children = '' }) {
  return markup`<li>
    <input type="checkbox" id="${id}" data-persist />
    <label for="${id}">${label}</label
    >${time === undefined ? '' : markup`<span class="route-time" title="Medido en un clon limpio">${time}</span>`}
    ${children}
  </li>`;
}

/**
 * @param {import('../sources/guide.mjs').Route} route
 * @param {Map<string, string>} times
 */
function renderRoute(route, times) {
  const prefix = `ruta-${route.minutes}`;
  const commands = route.commands.map((command, index) =>
    renderCheck({
      id: `${prefix}-c${index + 1}`,
      label: markup`<code>${command}</code>`,
      time: timeOf(command, times),
    }),
  );
  const items = route.items.map((item, index) => {
    const children = item.children.map((child, childIndex) =>
      renderCheck({
        id: `${prefix}-${index + 1}-${childIndex + 1}`,
        label: inlineMarkdown(child, GUIDE_FILE),
        time: timeOf(child, times),
      }),
    );
    const nested =
      children.length === 0
        ? ''
        : markup`<ul class="route-nested">
            ${children}
          </ul>`;
    return renderCheck({
      id: `${prefix}-${index + 1}`,
      label: inlineMarkdown(item.text, GUIDE_FILE),
      time: timeOf(item.text, times),
      children: nested,
    });
  });
  return markup`<article class="route" aria-labelledby="${prefix}-titulo" data-route>
    <h3 id="${prefix}-titulo"><span class="route-minutes">${route.minutes} min</span> ${route.title}</h3>
    ${route.intro === '' ? '' : markup`<p class="route-intro">${inlineMarkdown(route.intro, GUIDE_FILE)}</p>`}
    <ul class="route-list">
      ${commands}${items}
    </ul>
    <p class="route-progress" aria-live="polite" data-route-progress></p>
  </article>`;
}

/**
 * @param {readonly import('../sources/guide.mjs').Route[]} routes
 * @param {readonly import('../sources/workflow.mjs').MeasuredStep[]} steps
 */
export function renderRoutes(routes, steps) {
  const times = commandTimes(steps);
  return markup`<header class="section-head">
      <h2 id="recorridos-titulo">Tres recorridos, <span class="accent">según tu tiempo</span></h2>
      <p>
        Las listas de la <a href="${githubUrl(GUIDE_FILE)}">guía del evaluador</a>, para ir marcando. Junto a
        cada comando, lo que tardó en un clon limpio con las cachés vacías (<a
          href="${githubUrl(`${DIARY_FILE}#p12--cierre--2026-11-14--rama-docsp12-cierre`)}"
          >diario de P12</a
        >). Las marcas se guardan solo en este navegador.
      </p>
    </header>
    <div class="routes">${routes.map((route) => renderRoute(route, times))}</div>`;
}
