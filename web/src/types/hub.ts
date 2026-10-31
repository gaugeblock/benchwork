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
  api_key?: string;
  mode: string;
  role_overrides: Record<string, RoleOverrideConfig>;
}

export interface TestInferenceRequest {
  provider: string;
  model_name: string;
  base_url?: string;
  api_key_env?: string;
  api_key?: string;
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
  /** How the candidate was checked; always present in the Rust contract. */
  verification: VerificationReport;
  /** Storypole ticket the trace came from, when `storypole verify` captured it. */
  task_key?: string;
  /** HEAD commit captured at; `(task_key, head_commit_sha)` is the idempotency key. */
  head_commit_sha?: string;
}

/** Result of compiling and testing a synthesised candidate. */
export interface VerificationReport {
  ast_valid: boolean;
  typecheck_passed: boolean;
  tests_passed?: boolean;
  diagnostics: CompilerDiagnostic[];
  duration_ms: number;
}

/** One compiler message attached to a verification report. */
export interface CompilerDiagnostic {
  file: string;
  line: number;
  column: number;
  code?: string;
  message: string;
  suggestion?: string;
}

export interface ModelHubStatus {
  roles: Record<string, string>;
  spool_traces: AnonymizedSynthesisTrace[];
  spool_counts_by_tier: Record<string, number>;
}

