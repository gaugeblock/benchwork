export interface RoleOverrideConfig {
  enabled: boolean;
  provider: string;
  model_name: string;
  base_url?: string;
  api_key_env?: string;
  mode: string;
}

export interface UniversalModelConfig {
  use_universal_fallback: boolean;
  provider: string;
  model_name: string;
  base_url?: string;
  api_key_env?: string;
  mode: string;
  role_overrides: Record<string, RoleOverrideConfig>;
}

export interface TestInferenceRequest {
  provider: string;
  model_name: string;
  base_url?: string;
  api_key_env?: string;
  mode: string;
}

export interface TestInferenceReceipt {
  success: boolean;
  latency_ms: number;
  model_used: string;
  message: string;
}

export interface DiscoverModelsRequest {
  base_url: string;
  api_key?: string;
  api_key_env?: string;
}

export interface DiscoverModelsResponse {
  success: boolean;
  models: string[];
  message: string;
}

export interface AnonymizedSynthesisTrace {
  trace_id: string;
  language: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  selected_pattern_id?: string;
  anonymized_scope_signature: string;
  filled_holes: [string, string][];
  rejected_attempt?: string;
}

export interface ModelHubStatus {
  roles: Record<string, string>;
  spool_traces: AnonymizedSynthesisTrace[];
  spool_counts_by_tier: Record<string, number>;
}

