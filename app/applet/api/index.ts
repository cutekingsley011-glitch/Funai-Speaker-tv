import { createExpressApp } from '../backend/app.ts';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  // If Vercel rewrote /api/(.*) to /api, restore the full path from originalUrl
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    req.url = req.originalUrl;
  } else if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && !req.url.startsWith('/branding')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
