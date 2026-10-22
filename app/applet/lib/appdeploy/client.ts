/**
 * @appdeploy/client implementation for FUNAI SPEAKER TV
 * Adapts AppDeploy client calls to standard browser fetch
 */

function getAdminToken(): string {
  if (typeof window !== 'undefined') {
    try {
      let token = localStorage.getItem('fstv-admin-token') || '';
      if (!token) {
        token = 'Speaker6969';
        localStorage.setItem('fstv-admin-token', token);
      }
      return token;
    } catch {}
  }
  return 'Speaker6969';
}

function defaultHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { 'x-admin-token': token, 'Authorization': `Bearer ${token}` } : {};
}

function parseErrorMessage(data: any, status: number): string {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (data.error && typeof data.error === 'object') {
      if (typeof data.error.message === 'string' && data.error.message.trim()) return data.error.message.trim();
      if (typeof data.error.detail === 'string' && data.error.detail.trim()) return data.error.detail.trim();
    }
    if (data.message && typeof data.message === 'object') {
      if (typeof data.message.message === 'string' && data.message.message.trim()) return data.message.message.trim();
    }
  }
  if (status === 401 || status === 403) return 'Admin access required. Please sign in again.';
  if (status === 404) return 'Requested item was not found.';
  if (status === 413) return 'Upload size too large. Please choose a smaller photo.';
  return `Request failed with status ${status}`;
}

export const api = {
  get: async (url: string, config?: Record<string, any>) => {
    let fullUrl = url;
    const token = getAdminToken();
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
    if (token && !fullUrl.includes('token=')) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
    const res = await fetch(fullUrl, {
      headers: { Accept: 'application/json', ...defaultHeaders(), ...(config?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, res.status));
    }
    return { data, status: res.status, ok: res.ok };
  },

  post: async (url: string, body?: any, config?: Record<string, any>) => {
    const token = getAdminToken();
    let fullUrl = url;
    if (token && !fullUrl.includes('token=')) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
    const payload =
      body && typeof body === 'object' && !Array.isArray(body)
        ? { ...body, token: body.token || token }
        : (body ?? {});
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...defaultHeaders(),
        ...(config?.headers || {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, res.status));
    }
    return { data, status: res.status, ok: res.ok };
  },

  put: async (url: string, body?: any, config?: Record<string, any>) => {
    const token = getAdminToken();
    let fullUrl = url;
    if (token && !fullUrl.includes('token=')) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
    const payload =
      body && typeof body === 'object' && !Array.isArray(body)
        ? { ...body, token: body.token || token }
        : (body ?? {});
    const res = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...defaultHeaders(),
        ...(config?.headers || {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, res.status));
    }
    return { data, status: res.status, ok: res.ok };
  },

  delete: async (url: string, config?: Record<string, any>) => {
    const token = getAdminToken();
    let fullUrl = url;
    if (token && !fullUrl.includes('token=')) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
    let bodyData: any = JSON.stringify({ token });
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
      bodyData = JSON.stringify({ ...config, token });
    }
    const res = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...defaultHeaders(),
        ...(config?.headers || {}),
      },
      body: bodyData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, res.status));
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
