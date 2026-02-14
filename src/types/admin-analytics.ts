// Entity Type: admin_analytics
// From PROJECT-SPEC.md Gate 1
// Owner: system | Parent: none | States: none (append-only daily snapshots)

import type { AdminAnalytics as DBAdminAnalytics } from './database';

export interface AdminAnalytics extends DBAdminAnalytics {}

// Insert type
export type AdminAnalyticsInsert = Omit<
  AdminAnalytics,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// No update type (append-only)

// App type statistics
export interface AppTypeStats {
  type: string;
  count: number;
  percentage: number;
}

// Time series data point
export interface AnalyticsTimeSeriesPoint {
  date: string;
  new_signups: number;
  specs_generated: number;
  specs_downloaded: number;
  waitlist_signups: number;
  conversion_rate: number;
}

// Dashboard metrics summary
export interface DashboardMetrics {
  total_users: number;
  total_specs: number;
  total_downloads: number;
  avg_conversion_rate: number;
  total_api_cost: number;
  most_common_app_types: AppTypeStats[];
}
