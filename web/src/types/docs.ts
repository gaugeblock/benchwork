// TypeScript wire contract interfaces for 9-Document Architecture

export type DocType =
  | 'readme'
  | 'contributing'
  | 'product'
  | 'architecture'
  | 'spec'
  | 'design'
  | 'roadmap'
  | 'changelog'
  | 'agents';

export type DocStatus = 'present' | 'missing' | 'drifted';

export interface DocAuditItem {
  doc_type: DocType;
  path: string;
  status: DocStatus;
  violations: string[];
}

export interface DocAuditReport {
  items: DocAuditItem[];
}

export interface DocEntryConfig {
  path: string;
  required: boolean;
}

export interface DocsPoliciesConfig {
  enforce_public_type_contracts: boolean;
  enforce_crate_topology: boolean;
  enforce_file_loc_limits: boolean;
  enforce_readme_cli_flags: boolean;
  enforce_changelog_unreleased: boolean;
  enforce_contributing_toolchains: boolean;
}

export interface DocsConfig {
  docs: {
    readme: DocEntryConfig;
    contributing: DocEntryConfig;
    product: DocEntryConfig;
    architecture: DocEntryConfig;
    spec: DocEntryConfig;
    design: DocEntryConfig;
    roadmap: DocEntryConfig;
    changelog: DocEntryConfig;
    agents: DocEntryConfig;
  };
  policies: DocsPoliciesConfig;
}
