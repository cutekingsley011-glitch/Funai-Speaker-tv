import { createExpressApp } from './app.ts';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  try {
    return (app as any)(req, res, (err: any) => {
      if (err) {
        console.error('[Serverless Handler Error]', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', detail: String(err) });
        }
      }
    });
  } catch (syncErr: any) {
    console.error('[Serverless Synchronous Error]', syncErr);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', detail: String(syncErr) });
    }
  }
}

