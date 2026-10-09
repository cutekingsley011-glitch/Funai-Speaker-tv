/**
 * @appdeploy/sdk implementation for FUNAI SPEAKER TV
 * Provides in-memory document database, storage, router, and auth
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface DbRecord {
  id?: string;
  [key: string]: any;
}

class MemoryDatabase {
  private tables: Map<string, Map<string, any>> = new Map();
  private backupFile = path.resolve(process.cwd(), 'data-backup.json');

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    try {
      if (fs.existsSync(this.backupFile)) {
        const raw = fs.readFileSync(this.backupFile, 'utf-8');
        const data = JSON.parse(raw);

        const collections = ['posts', 'polls', 'events', 'comments', 'authors', 'members', 'newsletter', 'categories', 'submissions', 'adminActivity'];
        for (const col of collections) {
          if (Array.isArray(data[col])) {
            const table = this.getTable(col);
            for (const item of data[col]) {
              if (item.id) table.set(item.id, item);
            }
          }
        }

        const brandingTable = this.getTable('site_branding');
        brandingTable.set('default', {
          id: 'default',
          logoPath: data.branding?.logoUrl || 'branding/logo.png',
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('[MemoryDatabase] Failed to load data-backup.json:', err);
    }
  }

  private persist() {
    try {
      const collections = ['posts', 'polls', 'events', 'comments', 'authors', 'members', 'newsletter', 'categories', 'submissions', 'adminActivity'];
      const backup: Record<string, any> = {};
      for (const col of collections) {
        backup[col] = Array.from(this.getTable(col).values());
      }
      backup.branding = { logoUrl: '/branding/logo.png' };

      fs.writeFileSync(this.backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    } catch (err) {
      console.error('[MemoryDatabase] Failed to persist data-backup.json:', err);
    }
  }

  private getTable(name: string): Map<string, any> {
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
    }
    return this.tables.get(name)!;
  }

  async list<T = any>(
    collection: string,
    options?: { limit?: number; filter?: Record<string, any> }
  ): Promise<{ items: T[] }> {
    const table = this.getTable(collection);
    let items = Array.from(table.values());

    if (options?.filter) {
      items = items.filter((item) => {
        for (const [k, v] of Object.entries(options.filter!)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
    }

    if (options?.limit && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return { items };
  }

  async get<T = any>(collection: string | string[], ids?: string[]): Promise<T[]> {
    if (Array.isArray(collection)) {
      const table = this.getTable('posts');
      return collection.map((id) => table.get(id)).filter(Boolean);
    }
    const table = this.getTable(collection);
    const targetIds = ids || [];
    return targetIds.map((id) => table.get(id)).filter(Boolean);
  }

  async add(collection: string, records: any[]): Promise<string[]> {
    const table = this.getTable(collection);
    const addedIds: string[] = [];

    for (const rec of records) {
      const id = rec.id || `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const saved = { ...rec, id };
      table.set(id, saved);
      addedIds.push(id);
    }

    this.persist();
    return addedIds;
  }

  async update(
    collection: string,
    updates: Array<{ id: string; record: any }>
  ): Promise<boolean[]> {
    const table = this.getTable(collection);
    const results: boolean[] = [];

    for (const { id, record } of updates) {
      if (table.has(id)) {
        const existing = table.get(id);
        table.set(id, { ...existing, ...record, id });
        results.push(true);
      } else {
        table.set(id, { ...record, id });
        results.push(true);
      }
    }

    this.persist();
    return results;
  }

  async delete(collection: string, ids: string[]): Promise<boolean[]> {
    const table = this.getTable(collection);
    const results = ids.map((id) => table.delete(id));
    this.persist();
    return results;
  }
}

export const db = new MemoryDatabase();

// Storage implementation
const storageMap = new Map<string, { content: string; contentType?: string }>();

export const storage = {
  write: async (
    items: Array<{ path: string; content: string; contentType?: string }>
  ): Promise<boolean[]> => {
    for (const item of items) {
      storageMap.set(item.path, {
        content: item.content,
        contentType: item.contentType || 'image/png',
      });
    }
    return items.map(() => true);
  },

  url: async (paths: string[]): Promise<Array<{ url: string }>> => {
    return paths.map((p) => {
      const found = storageMap.get(p);
      if (found) {
        return { url: `data:${found.contentType};base64,${found.content}` };
      }
      if (p === 'branding/logo.png' || p?.endsWith('logo.png')) {
        return { url: '/branding/logo.png' };
      }
      if (p && (p.startsWith('uploads/') || p.startsWith('/uploads/'))) {
        return { url: p.startsWith('/') ? p : `/${p}` };
      }
      return { url: p ? (p.startsWith('http') ? p : `/${p}`) : '' };
    });
  },
};

// Secrets
export const secrets = {
  readSecret: async (key: string): Promise<string | null> => {
    if (process.env[key]) return process.env[key]!;
    if (key === 'FSTV_ADMIN_PASSWORD') {
      return process.env.FSTV_ADMIN_PASSWORD || '2026';
    }
    return null;
  },
};

// Notifications
export const notifications = {
  subscribeTopic: async (_opts: any) => ({ ok: true }),
  send: async (_opts: any) => ({ ok: true }),
  sendToTopic: async (_opts: any) => ({ ok: true }),
};

// WebSockets
export const ws = {
  send: async (_targets: any, _msg: any) => ({ ok: true }),
};

// Response Helpers
export function json(data: any, status = 200) {
  return { __appdeploy_type: 'json', data, status };
}

export function error(message: string, status = 400) {
  return { __appdeploy_type: 'error', data: { error: message, message }, status };
}

export function requireAuth() {
  return async (c: any) => {
    if (!c.user) {
      c.user = { userId: 'admin' };
    }
  };
}

// Router builder that mounts on Express
export function router(routesMap: Record<string, any[] | Function>) {
  const expressRouter = Router();

  for (const [routeKey, handlers] of Object.entries(routesMap)) {
    const parts = routeKey.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const method = parts[0].toLowerCase();
    const routePath = parts[1];
    const handlerList = Array.isArray(handlers) ? handlers : [handlers];

    (expressRouter as any)[method](routePath, async (req: Request, res: Response) => {
      const c = {
        req,
        res,
        params: req.params,
        query: req.query,
        body: req.body,
        user: (req as any).user || null,
      };

      try {
        let result: any;
        for (const handler of handlerList) {
          result = await handler(c);
          if (result && (result.__appdeploy_type || result.status || result.data)) {
            break;
          }
        }

        if (result && result.__appdeploy_type === 'json') {
          return res.status(result.status || 200).json(result.data);
        }
        if (result && result.__appdeploy_type === 'error') {
          return res.status(result.status || 400).json(result.data);
        }
        if (result !== undefined) {
          return res.json(result);
        }
      } catch (err: any) {
        console.error(`[Error in ${routeKey}]:`, err);
        return res.status(500).json({ error: err?.message || 'Internal Server Error' });
      }
    });
  }

  return expressRouter;
}

export default {
  db,
  storage,
  secrets,
  notifications,
  ws,
  json,
  error,
  requireAuth,
  router,
};
