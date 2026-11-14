// @ts-check
/**
 * What the walkthrough takes from the specification and the quality tooling (D-183): the acceptance criteria and
 * test vectors (with the same readers as `npm run trace`), the jobs of the CI and the test files of each layer.
 */
import { automatedCriteria, definedVectors } from '../../trace-tests.mjs';

export const CRITERIA_FILE = 'ai-workspace/02-especificacion/07-criterios-aceptacion.md';
export const VECTOR_FILES = [
  'ai-workspace/02-especificacion/02-reglas-negocio.md',
  'ai-workspace/02-especificacion/03-validacion-fiscal.md',
  'ai-workspace/02-especificacion/05-frontend.md',
];
export const CI_FILE = '.github/workflows/ci.yml';

/** @typedef {{ total: number, automated: number, reviewOnly: string[] }} CriteriaCount */
/** @typedef {{ id: string, name: string, steps: string[] }} CiJob */
/** @typedef {{ layer: string, folder: string, files: number }} TestLayer */

/**
 * @param {string} criteria the text of 07-criterios-aceptacion.md
 * @returns {CriteriaCount} every criterion, the ones with an automated level and the ones that are only reviewed
 */
export function criteriaCount(criteria) {
  const all = [...criteria.matchAll(/^\*\*(AC-\d+) · [^*]+\*\* · Refs: /gm)].map(([, id = '']) => id);
  const automated = new Set(automatedCriteria(criteria));
  return { total: all.length, automated: automated.size, reviewOnly: all.filter((id) => !automated.has(id)) };
}

/**
 * @param {readonly string[]} vectorFiles the texts of the files that define test vectors
 * @returns {number} how many test vectors the specification defines
 */
export function vectorCount(vectorFiles) {
  return new Set(vectorFiles.flatMap((text) => definedVectors(text))).size;
}

/**
 * @param {string} decisions the text of decisiones.md
 * @returns {number} how many decisions (`D-xx` rows) it records
 */
export function decisionCount(decisions) {
  return new Set([...decisions.matchAll(/^\| (D-\d+) \|/gm)].map(([, id]) => id)).size;
}

/**
 * The jobs of a GitHub Actions workflow and the names of their steps, read line by line (the workflow is written
 * with two-space indentation; no YAML library is needed for this).
 * @param {string} workflow
 * @returns {CiJob[]}
 */
export function workflowJobs(workflow) {
  const body = workflow.slice(workflow.search(/^jobs:\s*$/m));
  return body
    .split(/^(?= {2}[a-z][\w-]*:\s*$)/m)
    .slice(1)
    .map((chunk) => ({
      id: /^ {2}([\w-]+):/.exec(chunk)?.[1] ?? '',
      name: /^ {4}name: (.+)$/m.exec(chunk)?.[1]?.replace(/^'|'$/g, '') ?? '',
      steps: [...chunk.matchAll(/^ {6}- name: (.+)$/gm)].map(([, name = '']) => name),
    }));
}

/** Where the tests of each layer live (03-arquitectura/07-tests §1). */
export const TEST_LAYERS = [
  { layer: 'Dominio', folder: 'packages/domain' },
  { layer: 'Contrato', folder: 'packages/contract' },
  { layer: 'API', folder: 'apps/api' },
  { layer: 'Web', folder: 'apps/web' },
  { layer: 'Herramientas', folder: 'tools' },
  { layer: 'e2e', folder: 'e2e' },
];

/**
 * @param {readonly string[]} repoFiles repository-relative paths
 * @returns {TestLayer[]} the number of test files (`*.test.ts`, `*.spec.ts`) of each layer
 */
export function testFilesByLayer(repoFiles) {
  const tests = repoFiles.filter((path) => /\.(?:test|spec)\.ts$/.test(path));
  return TEST_LAYERS.map(({ layer, folder }) => ({
    layer,
    folder,
    files: tests.filter((path) => path.startsWith(`${folder}/`)).length,
  }));
}
