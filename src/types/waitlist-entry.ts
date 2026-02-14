// Entity Type: waitlist_entry
// From PROJECT-SPEC.md Gate 1
// Owner: system | Parent: none | States: pending, invited, converted

import type { WaitlistEntry as DBWaitlistEntry, WaitlistStatus } from './database';

export type { WaitlistStatus };

export interface WaitlistEntry extends DBWaitlistEntry {}

// Insert type
export type WaitlistEntryInsert = Omit<
  WaitlistEntry,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Update type (status changes)
export type WaitlistEntryUpdate = Partial<
  Omit<WaitlistEntry, 'id' | 'email' | 'created_at'>
>;

// Waitlist source types
export type WaitlistSource = 'build_cta' | 'pricing_page' | 'email_campaign';
