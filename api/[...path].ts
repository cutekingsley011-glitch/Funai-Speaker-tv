import { createExpressApp } from '../backend/app.ts';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  return (app as any)(req, res);
}

