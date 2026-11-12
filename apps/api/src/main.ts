import { buildApp } from './app.js';
import { loadServerConfig } from './config/server-config.js';

/** Composition root: the only module with side effects (ADR-010). */
async function main(): Promise<void> {
  const config = loadServerConfig();
  if (!config.ok) {
    process.stderr.write(`${config.error}\n`);
    process.exit(1);
  }

  const app = await buildApp({ logger: { level: config.value.logLevel } });

  const shutdown = (): void => {
    void app.close().then(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await app.listen({ host: config.value.host, port: config.value.port });
}

await main();
