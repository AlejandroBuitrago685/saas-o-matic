// @ts-check
/** A list of repository files, each with its name first and its folder under it, linked to GitHub (D-183). */
import { markup } from '../html.mjs';
import { githubUrl } from '../repo-links.mjs';
import { icon } from './icons.mjs';

/**
 * @param {readonly string[]} paths
 * @param {'file' | 'test'} kind
 * @param {string} label
 */
export function renderPaths(paths, kind, label) {
  return markup`<div class="paths">
    <h4>${label}</h4>
    <ul>
      ${paths.map((path) => {
        const slash = path.lastIndexOf('/');
        return markup`<li>
          <a href="${githubUrl(path)}"
            >${icon(kind)}<span class="path"
              ><code>${path.slice(slash + 1)}</code
              ><span class="path-dir">${path.slice(0, slash + 1)}</span></span
            ></a
          >
        </li>`;
      })}
    </ul>
  </div>`;
}
