import { describe, expect, it } from 'vitest';

import { findHardeningProblems } from '../scripts/check-containers.mjs';

type Inspected = Parameters<typeof findHardeningProblems>[0][number];

/** `docker inspect` of a container as docker-compose.yml starts it: only the fields the check reads. */
function container(
  service: string,
  overrides: { config?: object; hostConfig?: object; mounts?: object[] } = {},
) {
  return {
    Name: `/saas-o-matic-${service}-1`,
    Config: {
      User: service === 'api' ? 'node' : '101',
      Labels: { 'com.docker.compose.service': service },
      ...overrides.config,
    },
    HostConfig: {
      ReadonlyRootfs: true,
      Privileged: false,
      CapAdd: null,
      CapDrop: ['ALL'],
      NetworkMode: 'saas-o-matic_saas-o-matic',
      PidMode: '',
      SecurityOpt: ['no-new-privileges:true'],
      PortBindings: service === 'web' ? { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '8080' }] } : {},
      Tmpfs: { '/tmp': '' },
      ...overrides.hostConfig,
    },
    Mounts:
      overrides.mounts ?? (service === 'api' ? [{ Type: 'volume', Destination: '/data', RW: true }] : []),
  } as Inspected;
}

const stack = (api = container('api'), web = container('web')): Inspected[] => [api, web];

describe('AC-60 containers run without root and with a read-only file system', () => {
  it('accepts the stack as docker-compose.yml defines it', () => {
    expect(findHardeningProblems(stack())).toEqual([]);
  });

  it.each([
    ['empty (root by default)', ''],
    ['root', 'root'],
    ['uid 0', '0'],
    ['uid 0 with a group', '0:0'],
  ])('rejects a user that is %s', (_case, user) => {
    expect(findHardeningProblems(stack(container('api', { config: { User: user } })))).toEqual([
      'api: runs as root (Config.User is "' + user + '")',
    ]);
  });

  it('rejects a writable root file system', () => {
    expect(
      findHardeningProblems(stack(undefined, container('web', { hostConfig: { ReadonlyRootfs: false } }))),
    ).toEqual(['web: the root file system is writable (read_only: true is missing)']);
  });

  it('rejects a writable mount other than the data volume of the api', () => {
    const web = container('web', { mounts: [{ Type: 'bind', Destination: '/etc/nginx', RW: true }] });
    const api = container('api', {
      mounts: [
        { Type: 'volume', Destination: '/data', RW: true },
        { Type: 'volume', Destination: '/app', RW: true },
      ],
    });

    expect(findHardeningProblems(stack(api, web))).toEqual([
      'api: writable mount at /app (only /data is allowed)',
      'web: writable mount at /etc/nginx (none is allowed)',
    ]);
  });

  it('accepts read-only mounts anywhere', () => {
    const web = container('web', { mounts: [{ Type: 'bind', Destination: '/etc/nginx', RW: false }] });

    expect(findHardeningProblems(stack(undefined, web))).toEqual([]);
  });

  it('rejects a container that keeps its capabilities or can gain privileges', () => {
    const api = container('api', { hostConfig: { CapDrop: null, SecurityOpt: null } });

    expect(findHardeningProblems(stack(api))).toEqual([
      'api: capabilities are not dropped (cap_drop: [ALL] is missing)',
      'api: no-new-privileges is not set',
    ]);
  });

  // Regression of the P6 review: cap_drop: [ALL] alone would still pass with these.
  it.each([
    ['is privileged', { Privileged: true }, 'api: runs privileged (privileged: true)'],
    ['adds capabilities back', { CapAdd: ['NET_ADMIN'] }, 'api: adds capabilities back (cap_add: NET_ADMIN)'],
    ['shares the network of the host', { NetworkMode: 'host' }, 'api: shares the network of the host'],
    ['shares the processes of the host', { PidMode: 'host' }, 'api: shares the processes of the host'],
  ])('rejects a container that %s', (_case, hostConfig, problem) => {
    expect(findHardeningProblems(stack(container('api', { hostConfig })))).toEqual([problem]);
  });

  it('rejects a stack where a service is missing', () => {
    expect(findHardeningProblems([container('web')])).toEqual(['api: no running container found']);
  });

  it('D-155 checks every other container of the project too, such as web-api-down of the e2e stack', () => {
    const apiDown = container('web-api-down', {
      config: { User: 'root' },
      hostConfig: { ReadonlyRootfs: false },
    });

    expect(findHardeningProblems([...stack(), apiDown])).toEqual([
      'web-api-down: runs as root (Config.User is "root")',
      'web-api-down: the root file system is writable (read_only: true is missing)',
    ]);
    expect(findHardeningProblems([...stack(), container('web-api-down')])).toEqual([]);
  });

  it('names a container without the label of its service, instead of an empty name', () => {
    const unlabelled = container('web', { config: { Labels: {}, User: 'root' } });

    expect(findHardeningProblems([...stack(), unlabelled])).toEqual([
      '(unlabelled): runs as root (Config.User is "root")',
    ]);
  });
});

describe('D-99 D-130 published ports listen only on 127.0.0.1', () => {
  it.each([
    ['every interface', ''],
    ['an explicit 0.0.0.0', '0.0.0.0'],
    ['the IPv6 wildcard', '::'],
  ])('rejects the web port published on %s', (_case, hostIp) => {
    const web = container('web', {
      hostConfig: { PortBindings: { '8080/tcp': [{ HostIp: hostIp, HostPort: '8080' }] } },
    });

    expect(findHardeningProblems(stack(undefined, web))).toEqual([
      `web: port 8080/tcp is published on "${hostIp}" (only 127.0.0.1 is allowed)`,
    ]);
  });

  it('rejects any port published by the api, which is only reachable through nginx', () => {
    const api = container('api', {
      hostConfig: { PortBindings: { '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }] } },
    });

    expect(findHardeningProblems(stack(api))).toEqual([
      'api: publishes 3000/tcp, but it must not publish any port',
    ]);
  });
});
