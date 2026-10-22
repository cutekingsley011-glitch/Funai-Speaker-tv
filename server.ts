/**
 * FUNAI SPEAKER TV - Full-Stack Server
 * Mounts the original backend routes from backend/index.ts with Vite in development
 */

import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createExpressApp } from './backend/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createExpressApp();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Helper middleware/handler for dynamic story OpenGraph meta tags (for WhatsApp/social crawlers)
  const injectStoryMeta = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const storyId = (req.query.story as string) || (req.query.id as string);
    if (storyId) {
      try {
        const backupPath = path.resolve(__dirname, 'data-backup.json');
        if (fs.existsSync(backupPath)) {
          const dataBackup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
          const allPosts = dataBackup?.posts || [];
          const post = allPosts.find((p: any) => p.id === storyId);
          if (post) {
            let htmlPath = path.resolve(__dirname, 'index.html');
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
        }
      } catch (e) {
        console.warn('Error rendering story meta:', e);
      }
    }
    next();
  };

  app.get('*', injectStoryMeta);

  if (!isProd) {
    // Development: Mount Vite server middleware with HMR disabled (environment constraint)
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[FUNAI SPEAKER TV] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FUNAI SPEAKER TV] Failed to start:', err);
  process.exit(1);
});
