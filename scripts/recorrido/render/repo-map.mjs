// @ts-check
/**
 * The repository map (D-183): a tree of the folders and files worth opening, filterable by interest. The filter is a
 * group of toggle buttons that the page script enables; without script the whole tree is shown.
 */
import { INTERESTS, REPO_MAP } from '../content/repo-map.mjs';
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';
import { icon } from './icons.mjs';

/** @param {import('../content/repo-map.mjs').MapEntry} entry */
function renderEntry(entry) {
  const isFolder = !/\.[a-z]+$/.test(entry.path);
  const slash = entry.path.lastIndexOf('/');
  const name = entry.path.slice(slash + 1);
  const folder = entry.path.slice(0, slash + 1);
  return markup`<li class="map-entry" data-interests="${entry.interests.join(' ')}">
    <a href="${githubUrl(entry.path)}">${icon(isFolder ? 'folder' : 'file')}<span class="path"><code>${name}${isFolder ? '/' : ''}</code>${folder === '' ? '' : markup`<span class="path-dir">${folder}</span>`}</span></a>
    <p>${entry.what} <span class="map-when">${entry.when}</span></p>
    <ul class="map-tags" aria-label="Interés">
      ${entry.interests.map((interest) => markup`<li>${INTERESTS[interest]}</li>`)}
    </ul>
  </li>`;
}

export function renderRepoMap() {
  const total = REPO_MAP.reduce((sum, group) => sum + group.entries.length, 0);
  return markup`<header class="section-head">
      <h2 id="mapa-titulo">Dónde está <span class="accent">cada cosa</span></h2>
      <p>
        ${total} carpetas y ficheros que merece la pena abrir, no todos. Cada uno dice para qué sirve y cuándo
        abrirlo, y enlaza a GitHub.
      </p>
    </header>
    <div class="map-filter" data-map-filter hidden>
      <p id="mapa-filtro">Filtrar por interés</p>
      <div role="group" aria-labelledby="mapa-filtro">
        <button type="button" aria-pressed="true" data-interest="todo">Todo</button>
        ${Object.entries(INTERESTS).map(([key, label]) => markup`<button type="button" aria-pressed="false" data-interest="${key}">${label}</button>`)}
      </div>
      <p class="map-count" aria-live="polite" data-map-count>${total} entradas</p>
    </div>
    <div class="map-tree">
      ${REPO_MAP.map(
        (group) =>
          markup`<section
            class="map-group"
            aria-labelledby="mapa-${group.folder.replace(/[^a-z]+/gi, '-').toLowerCase()}"
          >
            <h3 id="mapa-${group.folder.replace(/[^a-z]+/gi, '-').toLowerCase()}">
              ${icon('folder')}${group.folder} <span>${group.what}</span>
            </h3>
            <ul class="map-entries">
              ${group.entries.map(renderEntry)}
            </ul>
          </section>`,
      )}
    </div>`;
}
