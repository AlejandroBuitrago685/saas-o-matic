/**
 * AC-59, D-154: every test of the API runs with the outbound network blocked. Loaded through `setupFiles`, so it is in
 * place before any test file is imported. Only loopback addresses and connections by path (Unix sockets, Windows named
 * pipes) are allowed; anything else throws synchronously, so the test fails at the line that tried it.
 *
 * Not covered, and forbidden instead by the ESLint rule of D-154 in `apps/api/src` (`node:dns`, `child_process`,
 * `worker_threads`…):
 * - child processes (the seed and `db:reset` tests start `tsx`) and worker threads, which do not inherit this guard;
 * - `dns.resolve*` and `dns.Resolver`, which send their own queries without `lookup` or `dgram`.
 */
import dgram from 'node:dgram';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';

const LOCAL_HOSTS = new Set(['localhost', '::1', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1']);
/** Set once: with `--no-isolate` or a reused worker, the setup file may run again and must not wrap twice. */
const INSTALLED = Symbol.for('saas-o-matic.no-outbound-network');

function isLocalHost(host: unknown): boolean {
  if (host === undefined || host === null || host === '') return true; // Node defaults to localhost.
  if (typeof host !== 'string') return false;
  const name = host.toLowerCase().replace(/^\[|\]$/g, '');
  // Only the literal `localhost`: a subdomain of it is local only if the system resolver says so (P9 review).
  return LOCAL_HOSTS.has(name) || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name);
}

function blocked(target: string): Error {
  return new Error(`outbound network is blocked in the tests (AC-59): ${target}`);
}

/** The target of `socket.connect(...)`, whatever its signature: (options), (path), (port, host) or a list. */
function connectTarget(args: readonly unknown[]): { path?: unknown; host?: unknown } {
  const [first, second] = Array.isArray(args[0]) ? args[0] : args;
  if (typeof first === 'string' && !/^\d+$/.test(first)) return { path: first };
  if (typeof first === 'object' && first !== null) return first as { path?: unknown; host?: unknown };
  return { host: typeof second === 'string' ? second : undefined };
}

function guardSockets(): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with Reflect.apply and its own socket
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(this: net.Socket, ...args: unknown[]): net.Socket {
    const { path, host } = connectTarget(args);
    if (path === undefined && !isLocalHost(host)) throw blocked(`TCP ${String(host)}`);
    return Reflect.apply(connect, this, args) as net.Socket;
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with Reflect.apply and its own socket
  const send = dgram.Socket.prototype.send;
  dgram.Socket.prototype.send = function guardedSend(this: dgram.Socket, ...args: unknown[]): void {
    const address = args.find((arg, index) => index > 0 && typeof arg === 'string');
    if (!isLocalHost(address)) throw blocked(`UDP ${String(address)}`);
    Reflect.apply(send, this, args);
  } as typeof send;

  // After connect(), send() carries no address: the target is checked here (P9 review).
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with Reflect.apply and its own socket
  const connectUdp = dgram.Socket.prototype.connect;
  dgram.Socket.prototype.connect = function guardedUdpConnect(this: dgram.Socket, ...args: unknown[]): void {
    const address = typeof args[1] === 'string' ? args[1] : undefined;
    if (!isLocalHost(address)) throw blocked(`UDP ${String(address)}`);
    Reflect.apply(connectUdp, this, args);
  };
}

function guardDns(): void {
  const { lookup } = dns;
  dns.lookup = function guardedLookup(hostname: string, ...rest: unknown[]): void {
    if (!isLocalHost(hostname)) throw blocked(`DNS ${hostname}`);
    Reflect.apply(lookup, dns, [hostname, ...rest]);
  } as typeof lookup;

  const lookupPromise = dns.promises.lookup;
  dns.promises.lookup = function guardedLookupPromise(
    hostname: string,
    ...rest: unknown[]
  ): Promise<unknown> {
    if (!isLocalHost(hostname)) return Promise.reject(blocked(`DNS ${hostname}`));
    return Reflect.apply(lookupPromise, dns.promises, [hostname, ...rest]) as Promise<unknown>;
  } as typeof lookupPromise;
}

/** `fetch` goes through undici's own connector; it is replaced so that the error names the URL. */
function guardFetch(): void {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (!isLocalHost(url.hostname)) throw blocked(`fetch ${url.origin}`);
    return original(input, init);
  };
}

const registry = globalThis as typeof globalThis & { [INSTALLED]?: true };
if (registry[INSTALLED] !== true) {
  registry[INSTALLED] = true;
  guardSockets();
  guardDns();
  guardFetch();
  // ESM named imports of built-in modules (`import { lookup } from 'node:dns/promises'`) see the guards too.
  syncBuiltinESMExports();
}
