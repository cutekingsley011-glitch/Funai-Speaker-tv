import express from 'express';
import path from 'path';
import fs from 'fs';
import { db, storage, router as createRouter } from '../lib/appdeploy/sdk.ts';
import { handler as apiHandler } from './index.ts';
import { realtimeSubscriptionRoutes } from './realtime-subscribers.ts';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createExpressApp() {
  const app = express();

  // Ensure uploads directory exists in public/uploads
  try {
    const pubUploads = path.resolve(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(pubUploads)) fs.mkdirSync(pubUploads, { recursive: true });
  } catch {}

  // Robust URL normalization: handles Vercel serverless rewrites and proxies first
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

  // Dedicated story image serving endpoint (handles Cloud Storage URLs, Base64 images, and local files)
  app.get(['/story-image/:id', '/api/story-image/:id'], async (req, res) => {
    try {
      const id = req.params.id;
      let post: any = null;
      try {
        const resDb = await db.get('posts', [id]);
        if (resDb && resDb[0]) post = resDb[0];
      } catch {}
      if (!post) {
        try {
          const listDb = await db.list('posts', { limit: 200 });
          post = listDb.items?.find((p: any) => p.id === id);
        } catch {}
      }
      if (!post) {
        const candidatePaths = [
          path.resolve(process.cwd(), 'data-backup.json'),
          path.resolve(__dirname, '../../data-backup.json'),
          path.resolve(__dirname, '../data-backup.json'),
          '/var/task/data-backup.json'
        ];
        for (const bp of candidatePaths) {
          if (fs.existsSync(bp)) {
            try {
              const dataBackup = JSON.parse(fs.readFileSync(bp, 'utf-8'));
              post = dataBackup?.posts?.find((p: any) => String(p.id) === String(id));
              if (post) break;
            } catch {}
          }
        }
      }
      if (!post) {
        return res.redirect(302, '/branding/logo.png');
      }

      if (post.imagePath) {
        try {
          const [u] = await storage.url([post.imagePath]);
          if (u?.url) return res.redirect(302, u.url);
        } catch {}
      }

      if (post.image && post.image.startsWith('data:image/')) {
        const comma = post.image.indexOf(',');
        const meta = post.image.slice(0, comma);
        const mime = meta.includes('png') ? 'image/png' : meta.includes('webp') ? 'image/webp' : 'image/jpeg';
        const buf = Buffer.from(post.image.slice(comma + 1), 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.send(buf);
      }

      if (post.image && post.image.startsWith('http')) {
        return res.redirect(302, post.image);
      }

      if (post.image && (post.image.startsWith('/uploads') || post.image.startsWith('uploads'))) {
        const cleanPath = post.image.replace(/^\//, '');
        const filePath = path.resolve(process.cwd(), 'public', cleanPath);
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
        return res.redirect(302, `/${cleanPath}`);
      }

      return res.redirect(302, '/branding/logo.png');
    } catch {
      return res.redirect(302, '/branding/logo.png');
    }
  });

  // Server-side OpenGraph Meta Tag Injection for WhatsApp, Facebook & Social Crawlers (?story=ID)
  app.get('*', async (req, res, next) => {
    const originalUrl = req.originalUrl || req.url || '';
    const forwardedUri = (req.headers['x-forwarded-uri'] as string) || '';
    const queryPath = (req.query?.__path as string) || '';

    // Check query params, path, and forwarded URIs for story identifier
    let storyId = (req.query.story as string) || (req.query.id as string) || (req.query.postId as string);
    if (!storyId) {
      const candidate = `${req.path} ${originalUrl} ${forwardedUri} ${queryPath}`;
      const match = candidate.match(/(?:[?&](?:story|id|postId)=|\/(?:story|posts|post)\/)([^&#/?\s]+)/i);
      if (match) storyId = match[1];
    }

    // Only skip to API router/static assets if this request is NOT for a specific story
    if (!storyId) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads') || req.path.startsWith('/assets') || req.path.startsWith('/branding') || req.path.startsWith('/story-image')) {
        return next();
      }
      // If a crawler or client was rewritten to /api without a story ID, serve default homepage HTML
      if (req.path === '/' || req.path === '/api') {
        let htmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
        if (!fs.existsSync(htmlPath)) htmlPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(htmlPath)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.sendFile(htmlPath);
        }
      }
      return next();
    }

    if (storyId) {
      try {
        storyId = decodeURIComponent(storyId).split('#')[0].trim();
        let post: any = null;
        try {
          const resDb = await db.get('posts', [storyId]);
          if (resDb && resDb[0]) post = resDb[0];
        } catch {}

        if (!post) {
          try {
            const listDb = await db.list('posts', { limit: 200 });
            post = listDb.items?.find((p: any) => String(p.id) === String(storyId));
          } catch {}
        }

        if (!post) {
          const backupPath = path.resolve(process.cwd(), 'data-backup.json');
          if (fs.existsSync(backupPath)) {
            const dataBackup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
            const allPosts = dataBackup?.posts || [];
            post = allPosts.find((p: any) => String(p.id) === String(storyId));
          }
        }

        if (post) {
          const forwardedProto = req.headers['x-forwarded-proto'] as string;
          const forwardedHost = req.headers['x-forwarded-host'] as string;
          const protocol = forwardedProto || req.protocol || 'https';
          const hostHeader = forwardedHost || req.get('host') || 'localhost:3000';
          let origin = '';
          if (process.env.APP_URL && process.env.APP_URL.startsWith('http') && !process.env.APP_URL.includes('localhost')) {
            origin = process.env.APP_URL.replace(/\/$/, '');
          } else {
            origin = `${protocol}://${hostHeader}`;
          }

          let rawImage = post.image || '';
          if (post.imagePath) {
            try {
              const [u] = await storage.url([post.imagePath]);
              if (u?.url) rawImage = u.url;
            } catch {}
          }

          let imageUrl = '';
          if (rawImage.startsWith('data:image/')) {
            imageUrl = `${origin}/story-image/${encodeURIComponent(post.id)}`;
          } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
            imageUrl = rawImage;
          } else if (rawImage.trim()) {
            const clean = rawImage.startsWith('/') ? rawImage : `/${rawImage}`;
            imageUrl = `${origin}${clean}`;
          } else {
            imageUrl = `${origin}/branding/logo.png`;
          }

          const title = `${post.title} — FUNAI SPEAKER TV`;
          const description = (post.excerpt || post.title || 'FUNAI campus news, updates and conversations.').trim();
          const shareUrl = `${origin}/?story=${encodeURIComponent(post.id)}`;
          const imageType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : imageUrl.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';

          let html = '';
          try {
            let htmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
            if (!fs.existsSync(htmlPath)) {
              htmlPath = path.resolve(process.cwd(), 'index.html');
            }
            if (fs.existsSync(htmlPath)) {
              html = fs.readFileSync(htmlPath, 'utf-8');
            }
          } catch {}

          if (!html) {
            html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
          }

          // Strip any default meta tags to prevent collision
          html = html
            .replace(/<title>[\s\S]*?<\/title>/gi, '')
            .replace(/<meta\s+[^>]*?(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*?>/gi, '');

          // Inject complete, explicit OpenGraph & Twitter tags optimized for WhatsApp preview
          const injectedMeta = [
            `<title>${escapeHtml(title)}</title>`,
            `<meta name="description" content="${escapeHtml(description)}">`,
            `<meta property="og:site_name" content="FUNAI SPEAKER TV">`,
            `<meta property="og:type" content="article">`,
            `<meta property="og:title" content="${escapeHtml(title)}">`,
            `<meta property="og:description" content="${escapeHtml(description)}">`,
            `<meta property="og:url" content="${escapeHtml(shareUrl)}">`,
            `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
            `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">`,
            `<meta property="og:image:type" content="${imageType}">`,
            `<meta property="og:image:width" content="1200">`,
            `<meta property="og:image:height" content="630">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:title" content="${escapeHtml(title)}">`,
            `<meta name="twitter:description" content="${escapeHtml(description)}">`,
            `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
          ].join('\n    ');

          html = html.replace('<head>', `<head>\n    ${injectedMeta}`);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(html);
        }
      } catch (e) {
        console.warn('Error injecting story meta:', e);
      }
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
