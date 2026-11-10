import { loadConfig } from './config/env';
import { createLogger } from './config/logger';
import { connectDb, disconnectDb } from './db';
import { createApp } from './app';
import { scheduleRetention } from './services/retention';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL);
  await connectDb(config.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const app = createApp(config, logger);
  const stopRetention = scheduleRetention(config, logger);
  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info({ host: config.HOST, port: config.PORT, env: config.NODE_ENV }, 'API listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopRetention();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
