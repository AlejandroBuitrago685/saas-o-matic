import dgram from 'node:dgram';
import dns from 'node:dns';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const BLOCKED = /outbound network is blocked in the tests \(AC-59\)/;
/** 192.0.2.0/24 is TEST-NET-1 (RFC 5737): never routed, so nothing leaves even if the guard failed. */
const PUBLIC_ADDRESS = '192.0.2.10';

const servers: net.Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

function listen(server: net.Server, target: number | string): Promise<net.Server> {
  servers.push(server);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    const onListening = (): void => {
      resolve(server);
    };
    if (typeof target === 'string') server.listen(target, onListening);
    else server.listen(target, '127.0.0.1', onListening);
  });
}

function connectAndClose(options: net.NetConnectOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(options, () => {
      socket.end();
      resolve();
    });
    socket.once('error', reject);
  });
}

/** A named pipe on Windows, a Unix socket elsewhere. */
function localPath(): string {
  const name = `saas-o-matic-guard-${String(process.pid)}-${String(Date.now())}`;
  return process.platform === 'win32' ? join('\\\\?\\pipe', name) : join(tmpdir(), `${name}.sock`);
}

describe('AC-59 D-154 the integration tests run with the outbound network blocked', () => {
  it('rejects fetch to an external host', async () => {
    await expect(fetch('https://example.com/')).rejects.toThrow(BLOCKED);
  });

  it('rejects a TCP connection to a public address', () => {
    expect(() => net.connect({ host: PUBLIC_ADDRESS, port: 443 })).toThrow(BLOCKED);
    expect(() => net.createConnection(443, PUBLIC_ADDRESS)).toThrow(BLOCKED);
  });

  it('rejects a TCP connection to a host name that is not local', () => {
    expect(() => net.connect({ host: 'example.com', port: 80 })).toThrow(BLOCKED);
  });

  it('rejects resolving an external host name', async () => {
    await expect(lookup('example.com')).rejects.toThrow(BLOCKED);
    expect(() => {
      dns.lookup('example.com', () => undefined);
    }).toThrow(BLOCKED);
  });

  it('rejects a UDP datagram to a public address', () => {
    const socket = dgram.createSocket('udp4');
    try {
      expect(() => {
        socket.send('x', 53, PUBLIC_ADDRESS);
      }).toThrow(BLOCKED);
    } finally {
      socket.close();
    }
  });

  // Regression of the P9 review: after connect(), send() carries no address at all.
  it('rejects connecting a UDP socket to a public address', () => {
    const socket = dgram.createSocket('udp4');
    try {
      expect(() => {
        socket.connect(53, PUBLIC_ADDRESS);
      }).toThrow(BLOCKED);
    } finally {
      socket.close();
    }
  });

  // Regression of the P9 review: `*.localhost` is only local if the system resolver says so.
  it('rejects a subdomain of localhost, which may be resolved outside', () => {
    expect(() => net.connect({ host: 'api.localhost', port: 80 })).toThrow(BLOCKED);
  });

  it('still allows a connection to the loopback address', async () => {
    const server = await listen(net.createServer(), 0);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected a TCP address');

    await expect(connectAndClose({ host: '127.0.0.1', port: address.port })).resolves.toBeUndefined();
    await expect(connectAndClose({ host: 'localhost', port: address.port })).resolves.toBeUndefined();
  });

  it('still allows a connection by path (a named pipe on Windows, a Unix socket elsewhere)', async () => {
    const path = localPath();
    await listen(net.createServer(), path);

    await expect(connectAndClose({ path })).resolves.toBeUndefined();
  });
});
