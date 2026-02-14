import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/user'

/**
 * Gets the role of the current authenticated user.
 * Returns null if not authenticated.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  return data?.role as UserRole | null
}

/**
 * Checks if the current user has the specified role.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const currentRole = await getCurrentUserRole()
  return currentRole === role
}

/**
 * Checks if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin')
}

/**
 * Requires admin role. Throws error if not admin.
 * Use in Server Actions and API routes that require admin access.
 */
export async function requireAdmin(): Promise<void> {
  const adminRole = await isAdmin()

  if (!adminRole) {
    throw new Error('Admin access required')
  }
}

/**
 * Checks if user has permission based on Gate 3 rules.
 * This is a utility for enforcing role-based permissions.
 */
export async function checkPermission(
  action: 'create' | 'read' | 'update' | 'delete',
  entity: string
): Promise<boolean> {
  const role = await getCurrentUserRole()

  if (!role) {
    return false
  }

  // Admin has full access
  if (role === 'admin') {
    return true
  }

  // System role is for automated processes
  if (role === 'system') {
    return ['create', 'read', 'update'].includes(action)
  }

  // User role permissions (Gate 3)
  if (role === 'user') {
    // Users can create spec_projects, chat_messages, feedback, waitlist_entries
    const creatableEntities = ['spec_project', 'chat_message', 'feedback', 'waitlist_entry']

    // Users can read their own data
    // Users can update their own spec_projects (only name field while not archived)
    // Users can archive their own spec_projects

    if (action === 'create' && creatableEntities.includes(entity)) {
      return true
    }

    if (action === 'read') {
      return true // RLS policies enforce "own data only"
    }

    if (action === 'update' && entity === 'spec_project') {
      return true // Limited to name field, enforced in mutation logic
    }

    if (action === 'delete' && entity === 'spec_project') {
      return true // Soft delete only
    }
  }

  return false
}
