// TypeScript wire contract interfaces matching benchwork-core

export type TaskStatus =
  | 'triage'
  | 'blocked'
  | 'ready'
  | 'in_progress'
  | 'synthesizing'
  | 'verifying'
  | 'verified'
  | 'deferred'
  | 'archived'
  | 'failed';

export type TaskKind = 'epic' | 'feature' | 'refactor' | 'bug' | 'tech_debt' | 'spike';

export interface TaskEdge {
  kind: 'blocked_by' | 'related_to' | 'discovered_from' | 'parent_epic';
  target_id: string;
}

export interface TaskScope {
  repo?: string;
  crate_name?: string;
  module_path?: string;
  target_files: string[];
  target_symbols: string[];
  labels: string[];
}

export interface TaskDecision {
  decision_id: string;
  parent_decision_id?: string;
  status: 'pending' | 'resolved' | 'superseded';
  category: string;
  question: string;
  proposed_options: string[];
  chosen_option?: string;
  rationale?: string;
  resolved_by?: string;
  updated_at_epoch_ms: number;
}

export interface AgentClaim {
  agent_id: string;
  claimed_at_epoch_ms: number;
  lease_expires_at_epoch_ms: number;
  git_branch?: string;
  base_commit_sha?: string;
}

export interface PlanStep {
  step_id: string;
  title: string;
  target_files: string[];
  verification_gate?: string;
  completed: boolean;
}

export interface TaskPlan {
  summary: string;
  design_markdown: string;
  steps: PlanStep[];
  plan_file_path?: string;
  updated_at_epoch_ms: number;
}

export interface VerificationReceipt {
  verifier: string;
  command: string;
  exit_code?: number;
  diagnostic_count?: number;
  summary: string;
  verified_at_epoch_ms: number;
  git_branch?: string;
  base_commit_sha?: string;
  head_commit_sha?: string;
  commit_shas?: string[];
}

export interface HandoffPacket {
  recorded_by_agent: string;
  timestamp_ms: number;
  completed_items: string[];
  remaining_items: string[];
  last_error_or_blocker?: string;
  git_ref?: string;
  dirty_files: string[];
}

export interface TaskNode {
  id: string;
  ticket_key: string;
  slug: string;
  title: string;
  description: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: number;
  scope: TaskScope;
  edges: TaskEdge[];
  decisions: TaskDecision[];
  acceptance_criteria: string[];
  plan?: TaskPlan;
  active_claim?: AgentClaim;
  latest_handoff?: HandoffPacket;
  verification_receipt?: VerificationReceipt;
  created_at_epoch_ms: number;
  updated_at_epoch_ms: number;
}

export interface TaskContextBriefing {
  task: TaskNode;
  verification_command?: string;
  related_tasks_summary: [string, string, TaskStatus][];
  inherited_decisions: TaskDecision[];
  file_collision_warnings: string[];
  known_deferred_issues_in_scope: [string, string][];
}

export interface WorkspaceCapabilities {
  root_path: string;
  spec_docs: {
    primary_spec_present: boolean;
    detected_files: string[];
  };
  storypole_active: boolean;
  task_counts: Record<string, number>;
  pending_decisions_count: number;
  dado_patterns_count: number;
  sawhorse_configured: boolean;
  pending_telemetry_count: number;
}

export interface ContractField {
  name: string;
  canonical_type: string;
  required: boolean;
}

export interface SharedTypeContract {
  name: string;
  fields: ContractField[];
}

export interface PendingDecision {
  task_id?: string;
  decision_id: string;
  prompt: string;
  options: string[];
  rationale?: string;
  source: string;
}

export interface SpecBundle {
  primary_spec?: string;
  supporting_docs: Record<string, string>;
  pending_decisions: PendingDecision[];
  contracts: SharedTypeContract[];
}

export interface DagStats {
  total: number;
  ready: number;
  in_progress: number;
  verified: number;
  blocked: number;
  deferred?: number;
  archived?: number;
}

export interface DagView {
  nodes: TaskNode[];
  topological_order: string[];
  stats: DagStats;
}

export interface TypedHole {
  hole_id: string;
  expected_type: string;
  kind: string;
  description: string;
}

export interface DadoPattern {
  pattern_id: string;
  language: string;
  domain: string;
  description: string;
  template_source: string;
  holes: TypedHole[];
}

export interface HoleCompileResponse {
  pattern_id: string;
  hole_id: string;
  expected_type: string;
  format: 'gbnf' | 'lark' | 'regex';
  grammar_definition: string;
  allowed_identifiers: string[];
}

export * from './types/hub';

export interface LiveEvent {
  type:
    | 'heartbeat'
    | 'task_updated'
    | 'decision_resolved'
    | 'synthesis_step'
    | 'synthesis_completed'
    | 'spool_updated';
  payload: any;
}
