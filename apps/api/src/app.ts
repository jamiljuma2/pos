import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth.routes.js';
import { businessRouter } from './modules/business.routes.js';
import { productsRouter } from './modules/products.routes.js';
import { reportsRouter } from './modules/reports.routes.js';
import { salesRouter } from './modules/sales.routes.js';
import { paymentsRouter } from './modules/payments.routes.js';
import { webhooksRouter } from './modules/webhooks.routes.js';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: [env.WEB_ORIGIN, env.API_ORIGIN],
      credentials: true
    })
  );
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });
    next();
  });
  app.use(rateLimit({ windowMs: 60_000, limit: 300 }));
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'pos-api', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/webhooks', webhooksRouter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/business', businessRouter);
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/reports', reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
