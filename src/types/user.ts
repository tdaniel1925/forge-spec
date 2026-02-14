// Entity Type: user
// From PROJECT-SPEC.md Gate 1
// Owner: self | Parent: none | States: active, inactive

import type { User as DBUser, UserStatus, AuthProviderType, UserRole } from './database';

export type { UserStatus, AuthProviderType, UserRole };

export interface User extends DBUser {}

// Insert type (for creating new users)
export type UserInsert = Omit<
  User,
  'id' | 'created_at' | 'updated_at' | 'specs_generated' | 'has_downloaded'
> & {
  id: string; // auth.users(id) reference
  created_at?: string;
  updated_at?: string;
  specs_generated?: number;
  has_downloaded?: boolean;
};

// Update type (for updating existing users)
export type UserUpdate = Partial<
  Omit<User, 'id' | 'created_at' | 'email'>
>;

// Public profile type (safe to expose to other users)
export interface UserProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}
