// Typed REST fetch client for /api/v1/* endpoints

import type {
  DagView,
  DadoPattern,
  HoleCompileResponse,
  ModelHubStatus,
  SharedTypeContract,
  SpecBundle,
  TaskContextBriefing,
  TestInferenceReceipt,
  TestInferenceRequest,
  UniversalModelConfig,
  WorkspaceCapabilities,
} from '../types';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCapabilities: () => fetchJson<WorkspaceCapabilities>('/api/v1/capabilities'),

  getSnapshot: () => fetchJson<any>('/api/v1/snapshot'),

  getSpec: () => fetchJson<SpecBundle>('/api/v1/spec'),

  resolveDecision: (data: {
    task_id?: string;
    decision_id: string;
    chosen_option: string;
    rationale: string;
    spawn_followup: boolean;
  }) =>
    fetchJson<any>('/api/v1/spec/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  previewContract: (contract: SharedTypeContract) =>
    fetchJson<{ rust_code: string; typescript_code: string; zod_code: string }>(
      '/api/v1/spec/contract-preview',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract }),
      }
    ),

  getDag: (params?: {
    repo?: string;
    crate_name?: string;
    status?: string;
    kind?: string;
    needs_decision?: boolean;
    include_archived?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.repo) searchParams.set('repo', params.repo);
    if (params?.crate_name) searchParams.set('crate_name', params.crate_name);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.kind) searchParams.set('kind', params.kind);
    if (params?.needs_decision !== undefined)
      searchParams.set('needs_decision', String(params.needs_decision));
    if (params?.include_archived !== undefined)
      searchParams.set('include_archived', String(params.include_archived));
    const qs = searchParams.toString();
    return fetchJson<DagView>(`/api/v1/dag${qs ? `?${qs}` : ''}`);
  },

  getTaskBriefing: (taskId: string) =>
    fetchJson<TaskContextBriefing>(`/api/v1/dag/${taskId}/briefing`),

  claimTask: (taskId: string, data: { agent_id: string; branch?: string }) =>
    fetchJson<TaskContextBriefing>(`/api/v1/dag/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  recordHandoff: (
    taskId: string,
    data: {
      recorded_by_agent: string;
      completed_items: string[];
      remaining_items: string[];
      last_error_or_blocker?: string;
      dirty_files?: string[];
      status?: string;
    }
  ) =>
    fetchJson<{ success: boolean }>(`/api/v1/dag/${taskId}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateTask: (
    taskId: string,
    data: {
      title?: string;
      description?: string;
      priority?: number;
      repo?: string;
      crate_name?: string;
      module_path?: string;
      target_files?: string[];
      target_symbols?: string[];
      labels?: string[];
      acceptance_criteria?: string[];
    }
  ) =>
    fetchJson<TaskContextBriefing>(`/api/v1/dag/${taskId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  linkTasks: (taskId: string, targetKey: string, kind?: string) =>
    fetchJson<{ success: boolean; edge_kind: string }>(`/api/v1/dag/${taskId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_key: targetKey, kind: kind || 'blocked_by' }),
    }),

  splitTask: (taskId: string, subtasks: string[], sequential?: boolean) =>
    fetchJson<{ parent_id: string; child_ids: string[] }>(`/api/v1/dag/${taskId}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtasks, sequential: Boolean(sequential) }),
    }),

  archiveTask: (taskId: string) =>
    fetchJson<{ success: boolean }>(`/api/v1/dag/${taskId}/archive`, {
      method: 'POST',
    }),

  unarchiveTask: (taskId: string) =>
    fetchJson<{ success: boolean }>(`/api/v1/dag/${taskId}/unarchive`, {
      method: 'POST',
    }),

  getPatterns: () => fetchJson<DadoPattern[]>('/api/v1/xray/patterns'),

  compileHole: (data: { pattern_id: string; hole_id: string; format: string }) =>
    fetchJson<HoleCompileResponse>('/api/v1/xray/compile-hole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  triggerSynthesis: (data: { task_id?: string; force_in_process: boolean }) =>
    fetchJson<{ status: string }>('/api/v1/synthesis/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getHubStatus: () => fetchJson<ModelHubStatus>('/api/v1/hub/models'),

  getHubConfig: () => fetchJson<UniversalModelConfig>('/api/v1/hub/config'),

  saveHubConfig: (config: UniversalModelConfig) =>
    fetchJson<{ success: boolean }>('/api/v1/hub/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  testInference: (data: TestInferenceRequest) =>
    fetchJson<TestInferenceReceipt>('/api/v1/hub/test-inference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteSpoolTrace: (traceId: string) =>
    fetchJson<{ deleted: boolean }>(`/api/v1/hub/spool/${traceId}`, {
      method: 'DELETE',
    }),

  pingModel: (role: string, prompt: string) =>
    fetchJson<{ role: string; text: string; latency_ms: number; model_used: string }>(
      '/api/v1/hub/ping',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, prompt }),
      }
    ),
};
