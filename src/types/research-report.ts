// Entity Type: research_report
// From PROJECT-SPEC.md Gate 1
// Owner: system | Parent: spec_project | States: generating, phase_1, phase_2, phase_3, phase_4, complete, failed

import type { ResearchReport as DBResearchReport, ResearchReportStatus, CompetitorAnalysis } from './database';

export type { ResearchReportStatus, CompetitorAnalysis };

export interface ResearchReport extends DBResearchReport {}

// Insert type
export type ResearchReportInsert = Omit<
  ResearchReport,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Update type (write-once per phase)
export type ResearchReportUpdate = Partial<
  Omit<ResearchReport, 'id' | 'spec_project_id' | 'created_at'>
>;

// Feature tree node structure
export interface FeatureNode {
  name: string;
  description?: string;
  components?: FeatureComponent[];
  children?: FeatureNode[];
  competitor_coverage?: string[]; // which competitors have this feature
}

// Atomic component structure
export interface FeatureComponent {
  name: string;
  description?: string;
  complexity: 'simple' | 'medium' | 'complex';
  required_library?: string;
  edge_cases?: string[];
}

// Technical requirements structure
export interface TechnicalRequirement {
  component: string;
  required_apis?: string[];
  required_libraries?: string[];
  data_model_fields?: string[];
  edge_cases?: string[];
  complexity_estimate: 'simple' | 'medium' | 'complex';
}

// Competitive gaps structure
export interface CompetitiveGaps {
  what_competitors_miss: string[];
  unique_angle: string;
  mvp_scope: string[];
  full_product_scope: string[];
  biggest_opportunity: string;
}
