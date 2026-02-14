// Entity Type: generated_spec
// From PROJECT-SPEC.md Gate 1
// Owner: system | Parent: spec_project | States: generating, validating, complete, failed

import type { GeneratedSpec as DBGeneratedSpec, GeneratedSpecStatus, ComplexityRating } from './database';

export type { GeneratedSpecStatus, ComplexityRating };

export interface GeneratedSpec extends DBGeneratedSpec {}

// Insert type
export type GeneratedSpecInsert = Omit<
  GeneratedSpec,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Update type (mutable during review, locked after download)
export type GeneratedSpecUpdate = Partial<
  Omit<GeneratedSpec, 'id' | 'spec_project_id' | 'created_at'>
>;

// Gate 0 structure
export interface Gate0 {
  system_name: string;
  tagline: string;
  what_it_is: string;
  who_it_is_for: Record<string, string>; // role -> description
  what_it_is_not: string[];
}

// Gate 1 entity structure
export interface Gate1Entity {
  name: string;
  owner: string;
  parent: string | null;
  states: string[];
  source_of_truth: string;
  key_fields: Record<string, string>; // field -> type/description
}

// Gate 2 state change structure
export interface Gate2StateChange {
  id: number;
  actor: string;
  action: string;
  state_change: string;
  preconditions: string;
}

// Gate 3 permission structure
export interface Gate3Permission {
  role: string;
  can_create: string[];
  can_read: string[];
  can_update: string[];
  can_archive: string[];
  special_rules?: string[];
}

// Gate 4 dependency structure
export interface Gate4Dependency {
  from: string;
  to: string;
  relationship: 'has_one' | 'has_many' | 'belongs_to';
  nullable: boolean;
}

// Gate 5 integration structure
export interface Gate5Integration {
  name: string;
  type: string;
  auth_method: string;
  endpoints: string[];
  webhooks_inbound?: string[];
  webhooks_outbound?: string[];
  error_handling: string;
  rate_limits?: string;
  env_vars: string[];
}

// Validation error structure
export interface ValidationError {
  gate: string;
  entity?: string;
  error_type: string;
  message: string;
  severity: 'error' | 'warning';
}

// Recommended stack structure
export interface RecommendedStack {
  framework: string;
  database: string;
  auth: string;
  ui_library: string[];
  ai_provider?: string;
  deployment?: string;
  [key: string]: unknown;
}
