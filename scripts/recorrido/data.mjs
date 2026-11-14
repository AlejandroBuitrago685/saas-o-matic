// @ts-check
/**
 * Everything the walkthrough shows, read from the repository in one place (D-183): documents, specification, CI,
 * test files, screenshots and the examples computed by the compiled domain.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSimulationRequestSchema } from '@saas-o-matic/contract';
import { MAX_SLIDER_POSITION } from '@saas-o-matic/domain';

import { listRepoFiles, REPO_ROOT } from '../lib/repo.mjs';
import { webpSize } from './sources/assets.mjs';
import * as examples from './sources/examples.mjs';
import { GUIDE_FILE, readingRoutes, requirementRows } from './sources/guide.mjs';
import * as workflow from './sources/workflow.mjs';
import * as quality from './sources/quality.mjs';

export const CAPTURES_DIR = 'docs/capturas';
/** The test vector the cover, the tier step and the simulator reproduce (02-reglas-negocio §6.1). */
const TIER_VECTOR = { id: 'TV-PR-07', users: 100 };
/** The screenshot of the currency step: 60 users of a Spanish customer, in pounds (e2e/capturas). */
const CURRENCY_EXAMPLE = { users: 60, currency: /** @type {const} */ ('GBP') };

/** @param {string} path */
const read = (path) => readFileSync(join(REPO_ROOT, path), 'utf8');

/** @returns {Readonly<Record<string, { width: number, height: number }>>} the size of every screenshot */
function captureSizes() {
  const names = readdirSync(join(REPO_ROOT, CAPTURES_DIR)).filter((name) => name.endsWith('.webp'));
  return Object.fromEntries(
    names.map((name) => [name, webpSize(readFileSync(join(REPO_ROOT, CAPTURES_DIR, name)))]),
  );
}

/** @param {import('@saas-o-matic/domain').CatalogInput} catalogInput */
async function ruleData(catalogInput) {
  const catalog = examples.validCatalog(catalogInput);
  const rates = await examples.loadReferenceRates();
  const converted = examples.pricingExample(catalog, CURRENCY_EXAMPLE.users, 'ES');
  return {
    search: { ...examples.searchExample('Telefonía Ñandú S.A.'), query: 'nandu' },
    taxIds: [examples.taxIdExample('12345678A', 'ES'), examples.taxIdExample('11111111H', 'ES')],
    taxRates: examples.taxRates(catalog),
    tiers: examples.pricingExample(catalog, TIER_VECTOR.users, 'ES'),
    tiersVector: TIER_VECTOR.id,
    converted,
    conversion: examples.convertedExample(converted, CURRENCY_EXAMPLE.currency, rates),
    requestFields: Object.keys(createSimulationRequestSchema.shape),
  };
}

/** @param {import('@saas-o-matic/domain').CatalogInput} catalogInput */
async function flowData(catalogInput) {
  const rules = await ruleData(catalogInput);
  const simulator = {
    catalog: catalogInput,
    example: rules.tiers,
    position: examples.sliderPosition(TIER_VECTOR.users),
    maxPosition: MAX_SLIDER_POSITION,
  };
  return { rules, sizes: captureSizes(), simulator };
}

function timelineData() {
  const plan = read(workflow.PLAN_FILE);
  return {
    parts: workflow.planParts(plan),
    pullRequests: workflow.partPullRequests(plan),
    decisionLeads: workflow.decisionLeads(read(workflow.DECISIONS_FILE)),
  };
}

/** @param {{ node: number, web: number }} tests */
function qualityData(tests) {
  return {
    jobs: quality.workflowJobs(read(quality.CI_FILE)),
    layers: quality.testFilesByLayer(listRepoFiles()),
    criteria: quality.criteriaCount(read(quality.CRITERIA_FILE)),
    vectors: quality.vectorCount(quality.VECTOR_FILES.map(read)),
    tests,
  };
}

export async function loadData() {
  const flow = await flowData(await examples.loadCatalogInput());
  const cleanClone = workflow.cleanCloneTimes(read(workflow.DIARY_FILE));
  const guide = read(GUIDE_FILE);
  const qualityFigures = qualityData(workflow.measuredTestCounts(cleanClone));
  const { criteria, vectors, tests } = qualityFigures;
  return {
    hero: {
      criteria,
      vectors,
      tests,
      decisions: quality.decisionCount(read(workflow.DECISIONS_FILE)),
      example: flow.rules.tiers,
      vectorId: TIER_VECTOR.id,
    },
    flow,
    timeline: timelineData(),
    quality: qualityFigures,
    moments: workflow.interventionMoments(read(workflow.WORKSPACE_README)),
    requirements: requirementRows(guide),
    routes: readingRoutes(guide),
    cleanClone,
  };
}
