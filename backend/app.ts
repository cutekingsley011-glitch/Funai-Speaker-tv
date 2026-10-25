import express from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '@appdeploy/sdk';
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

  // Server-side OpenGraph Meta Tag Injection for WhatsApp & Social Crawlers (?story=ID)
  app.get('*', async (req, res, next) => {
    const storyId = (req.query.story as string) || (req.query.id as string);
    if (storyId) {
      try {
        let post: any = null;
        try {
          const resDb = await db.get('posts', [storyId]);
          if (resDb && resDb[0]) post = resDb[0];
        } catch {}

        if (!post) {
          try {
            const listDb = await db.list('posts', { limit: 100 });
            post = listDb.items?.find((p: any) => p.id === storyId);
          } catch {}
        }

        if (!post) {
          const backupPath = path.resolve(process.cwd(), 'data-backup.json');
          if (fs.existsSync(backupPath)) {
            const dataBackup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
            const allPosts = dataBackup?.posts || [];
            post = allPosts.find((p: any) => p.id === storyId);
          }
        }

        if (post) {
          let htmlPath = path.resolve(process.cwd(), 'index.html');
          let html = fs.readFileSync(htmlPath, 'utf-8');
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
          const host = req.get('host') || 'localhost:3000';
          const imageUrl = post.image ? (post.image.startsWith('http') ? post.image : `${protocol}://${host}${post.image}`) : `${protocol}://${host}/branding/logo.png`;
          const title = `${post.title} — FUNAI SPEAKER TV`;
          const description = post.excerpt || post.title;
          const shareUrl = `${protocol}://${host}/?story=${post.id}`;

          html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
                     .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}"\/>`)
                     .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"\/>`)
                     .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"\/>`)
                     .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${imageUrl}"\/>`)
                     .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${shareUrl}"\/>`)
                     .replace(/<meta name="twitter:title" content=".*?"\/>/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}"\/>`)
                     .replace(/<meta name="twitter:description" content=".*?"\/>/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}"\/>`)
                     .replace(/<meta name="twitter:image" content=".*?"\/>/, `<meta name="twitter:image" content="${imageUrl}"\/>`);

          if (!html.includes('property="og:image"')) {
            html = html.replace('</head>', `<meta property="og:image" content="${imageUrl}"><meta name="twitter:image" content="${imageUrl}"></head>`);
          }

          res.send(html);
          return;
        }
      } catch (e) {
        console.warn('Error injecting story meta:', e);
      }
    }
    next();
  });

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
