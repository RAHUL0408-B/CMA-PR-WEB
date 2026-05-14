import { auth } from './firebase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function getToken(): Promise<string | null> {
  try { return await auth.currentUser?.getIdToken() || null; } catch { return null; }
}

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ---- CLIENTS ----
export const api = {
  clients: {
    list: () => fetchAPI<any[]>('/clients'),
    get: (id: string) => fetchAPI<any>(`/clients/${id}`),
    create: (data: any) => fetchAPI<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<any>(`/clients/${id}`, { method: 'DELETE' })
  },

  reports: {
    list: (clientId?: string) => fetchAPI<any[]>(`/reports${clientId ? `?clientId=${clientId}` : ''}`),
    get: (id: string) => fetchAPI<any>(`/reports/${id}`),
    create: (data: any) => fetchAPI<any>('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI<any>(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<any>(`/reports/${id}`, { method: 'DELETE' })
  },

  financials: {
    list: (reportId: string) => fetchAPI<any[]>(`/financials/${reportId}`),
    upsert: (reportId: string, data: any) => fetchAPI<any>(`/financials/${reportId}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (reportId: string, yearId: string) => fetchAPI<any>(`/financials/${reportId}/${yearId}`, { method: 'DELETE' })
  },

  projections: {
    getAssumptions: (reportId: string) => fetchAPI<any>(`/projections/${reportId}/assumptions`),
    saveAssumptions: (reportId: string, data: any) => fetchAPI<any>(`/projections/${reportId}/assumptions`, { method: 'PUT', body: JSON.stringify(data) }),
    compute: (reportId: string) => fetchAPI<any>(`/projections/${reportId}/compute`, { method: 'POST' }),
    get: (reportId: string) => fetchAPI<any>(`/projections/${reportId}`)
  },

  ai: {
    generate: (reportId: string, module: string) => fetchAPI<any>(`/ai/${reportId}/generate`, { method: 'POST', body: JSON.stringify({ module }) }),
    history: (reportId: string) => fetchAPI<any[]>(`/ai/${reportId}/history`)
  },

  mappings: {
    suggest: (label: string) => fetchAPI<any>('/mappings/suggest', { method: 'POST', body: JSON.stringify({ label }) }),
    bulkSuggest: (labels: string[]) => fetchAPI<any>('/mappings/bulk-suggest', { method: 'POST', body: JSON.stringify({ labels }) }),
    learn: (sourceLabel: string, targetField: string) => fetchAPI<any>('/mappings/learn', { method: 'POST', body: JSON.stringify({ sourceLabel, targetField }) })
  },

  exports: {
    excel: (reportId: string) => fetchAPI<any>(`/exports/${reportId}/excel`, { method: 'POST' }),
    files: (reportId: string) => fetchAPI<any[]>(`/exports/${reportId}/files`)
  }
};
