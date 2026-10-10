import express from 'express';
import path from 'path';
import { handler as apiHandler } from './index.ts';
import { realtimeSubscriptionRoutes } from './realtime-subscribers.ts';
import { router as createRouter } from '../lib/appdeploy/sdk.ts';

export function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Robust URL normalization middleware for Vercel Serverless Functions and reverse proxies
  app.use((req, _res, next) => {
    const matched = (req.headers['x-matched-path'] as string) ||
                    (req.headers['x-forwarded-uri'] as string) ||
                    (req.headers['x-now-route-matches'] as string);
    if (matched && matched.startsWith('/api')) {
      req.url = matched;
    } else if (req.originalUrl && req.originalUrl.startsWith('/api') && (!req.url || req.url === '/' || !req.url.startsWith('/api'))) {
      req.url = req.originalUrl;
    } else if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && !req.url.startsWith('/branding') && req.url !== '/') {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    next();
  });

  // Static uploads & branding with durable caching
  const uploadsPath = path.resolve(process.cwd(), 'public/uploads');
  const brandingPath = path.resolve(process.cwd(), 'public/branding');
  app.use(
    '/uploads',
    express.static(uploadsPath, {
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      },
    })
  );
  app.use(
    '/branding',
    express.static(brandingPath, {
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      },
    })
  );

  // Mount original backend handlers
  app.use(apiHandler);
  app.use(createRouter(realtimeSubscriptionRoutes));

  // Health checks
  app.get(['/api/health', '/health', '/api', '/api/_healthcheck'], (_req, res) => {
    res.json({ ok: true, app: 'FUNAI SPEAKER TV', status: 'online', time: Date.now() });
  });

  return app;
}
