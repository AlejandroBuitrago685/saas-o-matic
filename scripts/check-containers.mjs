// @ts-check
/**
 * Inspects the running Docker Compose stack and fails if a container is not hardened (AC-60, RNF-SEC-16, D-99, D-130):
 * - it runs as root;
 * - its root file system is writable, or it has a writable mount other than the data volume of the api;
 * - it keeps its Linux capabilities or can gain privileges;
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
 *     CapDrop: string[] | null,
 *     SecurityOpt: string[] | null,
 *     PortBindings: Record<string, PortBinding[] | null> | null,
 *   },
 *   Mounts: Mount[],
 * }} InspectedContainer
 */

/** The only writable mounts of each service of docker-compose.yml; `tmpfs` mounts live in memory and are not listed. */
const WRITABLE_MOUNTS = /** @type {const} */ ({ api: ['/data'], web: [] });
/** Services that publish no port at all. */
const PRIVATE_SERVICES = ['api'];
const LOOPBACK = '127.0.0.1';
const ROOT_USER = /^(root|0)(:.*)?$/;

/**
 * @param {string} service
 * @param {InspectedContainer} container
 * @returns {string[]}
 */
function privilegeProblems(service, { Config, HostConfig }) {
  const problems = [];
  if (Config.User === '' || ROOT_USER.test(Config.User)) {
    problems.push(`${service}: runs as root (Config.User is "${Config.User}")`);
  }
  if (!(HostConfig.CapDrop ?? []).includes('ALL')) {
    problems.push(`${service}: capabilities are not dropped (cap_drop: [ALL] is missing)`);
  }
  if (!(HostConfig.SecurityOpt ?? []).some((option) => /^no-new-privileges(:true)?$/.test(option))) {
    problems.push(`${service}: no-new-privileges is not set`);
  }
  return problems;
}

/**
 * @param {keyof typeof WRITABLE_MOUNTS} service
 * @param {InspectedContainer} container
 * @returns {string[]}
 */
function fileSystemProblems(service, { HostConfig, Mounts }) {
  const allowed = /** @type {readonly string[]} */ (WRITABLE_MOUNTS[service]);
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
 * @returns {string[]} one line per problem, in service order; empty when the stack is hardened
 */
export function findHardeningProblems(containers) {
  return /** @type {(keyof typeof WRITABLE_MOUNTS)[]} */ (Object.keys(WRITABLE_MOUNTS)).flatMap((service) => {
    const container = containers.find(
      ({ Config }) => Config.Labels['com.docker.compose.service'] === service,
    );
    if (container === undefined) return [`${service}: no running container found`];
    return [
      ...privilegeProblems(service, container),
      ...fileSystemProblems(service, container),
      ...portProblems(service, container),
    ];
  });
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
