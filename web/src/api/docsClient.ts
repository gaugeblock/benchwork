import type { DocAuditReport, DocsConfig } from '../types/docs';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const docsApi = {
  getDocsAudit: () => fetchJson<DocAuditReport>('/api/v1/docs/audit'),

  getDocsConfig: () => fetchJson<DocsConfig>('/api/v1/docs/config'),

  saveDocsConfig: (config: DocsConfig) =>
    fetchJson<string>('/api/v1/docs/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  scaffoldDocs: (doc?: string, force = false) =>
    fetchJson<string[]>('/api/v1/docs/scaffold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, force }),
    }),

  migrateDocs: (source: string, apply = false) =>
    fetchJson<any>('/api/v1/docs/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, apply }),
    }),
};
