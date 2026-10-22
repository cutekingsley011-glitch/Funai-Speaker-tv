import express from 'express';
import { handler as apiHandler } from './index.ts';
import { realtimeSubscriptionRoutes } from './realtime-subscribers.ts';
import { router as createRouter } from '../lib/appdeploy/sdk.ts';

export function createExpressApp() {
  const app = express();

  // Robust URL normalization: handles Vercel serverless rewrites and proxies
  app.use((req, _res, next) => {
    const forwardedUri = req.headers['x-forwarded-uri'] as string | undefined;
    const matchedPath = req.headers['x-matched-path'] as string | undefined;
    const queryPath = req.query?.__path as string | undefined;
    if (forwardedUri && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    } else if (matchedPath && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    } else if (queryPath) {
      const cleanSub = queryPath.replace(/^\/+/, '');
      const searchIdx = req.url.indexOf('?');
      const search = searchIdx !== -1 ? req.url.slice(searchIdx) : '';
      req.url = `/api/${cleanSub}${search}`;
    }
    next();
  });

  // Safe body parsing: prevent hanging on Vercel / serverless when req.body is pre-parsed
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    express.json({ limit: '15mb' })(req, res, next);
  });

  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    express.urlencoded({ extended: true, limit: '15mb' })(req, res, next);
  });

  // Mount original backend handlers
  app.use(apiHandler);
  app.use(createRouter(realtimeSubscriptionRoutes));

  // Health check
  app.get(['/api/health', '/api/_healthcheck'], (_req, res) => {
    res.json({ ok: true, app: 'FUNAI SPEAKER TV', time: Date.now() });
  });

  return app;
}
