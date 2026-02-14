// Entity Type: feedback
// From PROJECT-SPEC.md Gate 1
// Owner: user | Parent: spec_project (optional) | States: pending, reviewed

import type { Feedback as DBFeedback, FeedbackStatus, FeedbackType } from './database';

export type { FeedbackStatus, FeedbackType };

export interface Feedback extends DBFeedback {}

// Insert type
export type FeedbackInsert = Omit<
  Feedback,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Update type (admin can mark as reviewed)
export type FeedbackUpdate = Partial<
  Omit<Feedback, 'id' | 'user_id' | 'created_at'>
>;

// Feedback summary for admin
export interface FeedbackSummary {
  total_count: number;
  average_rating: number;
  by_type: Record<FeedbackType, number>;
  by_status: Record<FeedbackStatus, number>;
}
