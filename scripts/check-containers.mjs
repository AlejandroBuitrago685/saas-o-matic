// @ts-check
/**
 * Inspects the running Docker Compose stack and fails if a container is not hardened (AC-60, RNF-SEC-16, D-99, D-130):
 * - it runs as root;
 * - its root file system is writable, or it has a writable mount other than the data volume of the api;
 * - it keeps or adds back Linux capabilities, runs privileged, shares the network or processes of the host, or can
 *   gain privileges;
 * - it publishes a port on an address other than 127.0.0.1 (Docker bypasses the host firewall), or it is the api,
 *   which publishes none and is only reachable through nginx.
 * Usage: node scripts/check-containers.mjs [compose project, default saas-o-matic]
 */
import { pathToFileURL } from 'node:url';

import { run } from './lib/repo.mjs';

/**
 * @typedef {{ Type: string, Destination: string, RW: boolean }} Mount
 * @typedef {{ HostIp: string, HostPort: string }} PortBinding
 * @typedef {{
 *   Name: string,
 *   Config: { User: string, Labels: Record<string, string> },
 *   HostConfig: {
 *     ReadonlyRootfs: boolean,
 *     Privileged: boolean,
 *     CapAdd: string[] | null,
 *     CapDrop: string[] | null,
 *     SecurityOpt: string[] | null,
 *     NetworkMode: string,
 *     PidMode: string,
 *     PortBindings: Record<string, PortBinding[] | null> | null,
 *   },
 *   Mounts: Mount[],
 * }} InspectedContainer
 */

/** The only writable mounts of each service of docker-compose.yml; `tmpfs` mounts live in memory and are not listed. */
const WRITABLE_MOUNTS = /** @type {Readonly<Record<string, readonly string[]>>} */ ({ api: ['/data'] });
/** Services every stack runs. Any other container of the project (`web-api-down` of the e2e stack) is checked too. */
const REQUIRED_SERVICES = ['api', 'web'];
/** Services that publish no port at all. */
const PRIVATE_SERVICES = ['api'];
const LOOPBACK = '127.0.0.1';
const ROOT_USER = /^(root|0)(:.*)?$/;
const NO_NEW_PRIVILEGES = /^no-new-privileges(:true)?$/;

/**
 * What a container must not be able to do (RNF-SEC-16). `cap_drop: [ALL]` alone is not enough: `privileged`, `cap_add`
 * or the namespaces of the host would give the power back (regression of the P6 review).
 * @type {readonly { fails: (container: InspectedContainer) => boolean, problem: (container: InspectedContainer) => string }[]}
 */
const PRIVILEGE_RULES = [
  {
    fails: ({ Config }) => Config.User === '' || ROOT_USER.test(Config.User),
    problem: ({ Config }) => `runs as root (Config.User is "${Config.User}")`,
  },
  { fails: ({ HostConfig }) => HostConfig.Privileged, problem: () => 'runs privileged (privileged: true)' },
  {
    fails: ({ HostConfig }) => (HostConfig.CapAdd ?? []).length > 0,
    problem: ({ HostConfig }) => `adds capabilities back (cap_add: ${(HostConfig.CapAdd ?? []).join(', ')})`,
  },
  {
    fails: ({ HostConfig }) => !(HostConfig.CapDrop ?? []).includes('ALL'),
    problem: () => 'capabilities are not dropped (cap_drop: [ALL] is missing)',
  },
  {
    fails: ({ HostConfig }) =>
      !(HostConfig.SecurityOpt ?? []).some((option) => NO_NEW_PRIVILEGES.test(option)),
    problem: () => 'no-new-privileges is not set',
  },
  {
    fails: ({ HostConfig }) => HostConfig.NetworkMode === 'host',
    problem: () => 'shares the network of the host',
  },
  {
    fails: ({ HostConfig }) => HostConfig.PidMode === 'host',
    problem: () => 'shares the processes of the host',
  },
];

/**
 * @param {string} service
 * @param {InspectedContainer} container
 * @returns {string[]}
 */
function privilegeProblems(service, container) {
  return PRIVILEGE_RULES.filter((rule) => rule.fails(container)).map(
    (rule) => `${service}: ${rule.problem(container)}`,
  );
}

/**
 * @param {string} service
 * @param {InspectedContainer} container
 * @returns {string[]}
 */
function fileSystemProblems(service, { HostConfig, Mounts }) {
  const allowed = WRITABLE_MOUNTS[service] ?? [];
  const problems = HostConfig.ReadonlyRootfs
    ? []
    : [`${service}: the root file system is writable (read_only: true is missing)`];
  const rule = allowed.length === 0 ? 'none is allowed' : `only ${allowed.join(', ')} is allowed`;
  for (const mount of Mounts) {
    if (mount.RW && !allowed.includes(mount.Destination)) {
      problems.push(`${service}: writable mount at ${mount.Destination} (${rule})`);
    }
  }
  return problems;
}

/**
 * @param {string} service
 * @param {InspectedContainer} container
 * @returns {string[]}
 */
function portProblems(service, { HostConfig }) {
  const published = Object.entries(HostConfig.PortBindings ?? {}).filter(
    ([, bindings]) => (bindings ?? []).length > 0,
  );
  if (PRIVATE_SERVICES.includes(service)) {
    return published.map(([port]) => `${service}: publishes ${port}, but it must not publish any port`);
  }
  return published.flatMap(([port, bindings]) =>
    (bindings ?? [])
      .filter(({ HostIp }) => HostIp !== LOOPBACK)
      .map(
        ({ HostIp }) => `${service}: port ${port} is published on "${HostIp}" (only ${LOOPBACK} is allowed)`,
      ),
  );
}

/**
 * @param {readonly InspectedContainer[]} containers what `docker inspect` returns for the containers of the stack
 * @returns {string[]} one line per problem: missing services first, then by service name; empty when hardened
 */
export function findHardeningProblems(containers) {
  /** A container without the label of its service is reported as such, never with an empty name. */
  const serviceOf = (/** @type {InspectedContainer} */ { Config }) =>
    Config.Labels['com.docker.compose.service'] ?? '(unlabelled)';
  const services = new Set(containers.map(serviceOf));
  const missing = REQUIRED_SERVICES.filter((service) => !services.has(service)).map(
    (service) => `${service}: no running container found`,
  );
  // Code-point order, the same on every machine (P9 review: localeCompare depends on the locale).
  const ordered = [...containers].sort((a, b) =>
    serviceOf(a) < serviceOf(b) ? -1 : Number(serviceOf(a) > serviceOf(b)),
  );
  return [
    ...missing,
    ...ordered.flatMap((container) => {
      const service = serviceOf(container);
      return [
        ...privilegeProblems(service, container),
        ...fileSystemProblems(service, container),
        ...portProblems(service, container),
      ];
    }),
  ];
}

/**
 * @param {string} project
 * @returns {InspectedContainer[]}
 */
function inspectProject(project) {
  const ids = run('docker', ['ps', '-q', '--filter', `label=com.docker.compose.project=${project}`]);
  if (ids.code !== 0) throw new Error(`docker ps failed: ${ids.output}`);
  const idList = ids.output.split(/\s+/).filter((id) => id !== '');
  if (idList.length === 0) return [];
  const inspected = run('docker', ['inspect', ...idList]);
  if (inspected.code !== 0) throw new Error(`docker inspect failed: ${inspected.output}`);
  return /** @type {InspectedContainer[]} */ (JSON.parse(inspected.output));
}

function main() {
  const project = process.argv[2] ?? 'saas-o-matic';
  const problems = findHardeningProblems(inspectProject(project));
  if (problems.length > 0) {
    process.stderr.write(`Containers of "${project}" are not hardened (AC-60):\n${problems.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `Containers of "${project}": non-root, read-only, no capabilities, ports on ${LOOPBACK} only.\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
