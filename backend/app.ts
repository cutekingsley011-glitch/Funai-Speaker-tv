import express from 'express';
import path from 'path';
import fs from 'fs';
import { handler as apiHandler } from './index.ts';
import { realtimeSubscriptionRoutes } from './realtime-subscribers.ts';
import { router as createRouter } from '../lib/appdeploy/sdk.ts';

export function createExpressApp() {
  const app = express();

  // Ensure uploads directory exists in public/uploads
  try {
    const pubUploads = path.resolve(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(pubUploads)) fs.mkdirSync(pubUploads, { recursive: true });
  } catch {}

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

  // Direct static serving of uploads
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));
  app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount original backend handlers
  app.use(apiHandler);
  app.use(createRouter(realtimeSubscriptionRoutes));

  // Health check
  app.get(['/api/health', '/api/_healthcheck'], (_req, res) => {
    res.json({ ok: true, app: 'FUNAI SPEAKER TV', time: Date.now() });
  });

  // Global error handler to always return clean JSON error instead of 500 crash
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[FUNAI API Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      status: err.status || 500
    });
  });

  return app;
}

