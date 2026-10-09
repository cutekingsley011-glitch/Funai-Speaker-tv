import express from 'express';
import { handler as apiHandler } from './index.ts';
import { realtimeSubscriptionRoutes } from './realtime-subscribers.ts';
import { router as createRouter } from '../lib/appdeploy/sdk.ts';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount original backend handlers
  app.use(apiHandler);
  app.use(createRouter(realtimeSubscriptionRoutes));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'FUNAI SPEAKER TV', time: Date.now() });
  });

  return app;
}
