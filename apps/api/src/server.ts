import { env } from './config/env.js';
import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'POS API started');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down POS API');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
