// Entity Type: spec_project
// From PROJECT-SPEC.md Gate 1
// Owner: user | Parent: none | States: researching, chatting, generating, review, complete, archived

import type { SpecProject as DBSpecProject, SpecProjectStatus, ResearchStatus, SpecStatus } from './database';

export type { SpecProjectStatus, ResearchStatus, SpecStatus };

export interface SpecProject extends DBSpecProject {}

// Insert type
export type SpecProjectInsert = Omit<
  SpecProject,
  'id' | 'created_at' | 'updated_at' | 'download_count' | 'version'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  download_count?: number;
  version?: number;
};

// Update type
export type SpecProjectUpdate = Partial<
  Omit<SpecProject, 'id' | 'user_id' | 'created_at'>
>;

// List view type (for dashboard display)
export interface SpecProjectListItem {
  id: string;
  name: string;
  status: SpecProjectStatus;
  entity_count: number | null;
  created_at: string;
  download_count: number;
  spec_status: SpecStatus;
}
