/**
 * @appdeploy/client implementation for FUNAI SPEAKER TV
 * Adapts AppDeploy client calls to standard browser fetch
 */

export const api = {
  get: async (url: string, config?: Record<string, any>) => {
    let fullUrl = url;
    if (config && typeof config === 'object') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(config)) {
        if (k !== 'headers' && v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
    }
    const res = await fetch(fullUrl, {
      headers: { Accept: 'application/json', ...(config?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return { data, status: res.status, ok: res.ok };
  },

  post: async (url: string, body?: any, config?: Record<string, any>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config?.headers || {}),
      },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return { data, status: res.status, ok: res.ok };
  },

  put: async (url: string, body?: any, config?: Record<string, any>) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config?.headers || {}),
      },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return { data, status: res.status, ok: res.ok };
  },

  delete: async (url: string, config?: Record<string, any>) => {
    let fullUrl = url;
    let bodyData: any = undefined;
    if (config && typeof config === 'object') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(config)) {
        if (k !== 'headers' && v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
      bodyData = JSON.stringify(config);
    }
    const res = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config?.headers || {}),
      },
      body: bodyData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }
    return { data, status: res.status, ok: res.ok };
  },
};

export const notifications = {
  subscribe: async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
};

export default { api, notifications };
