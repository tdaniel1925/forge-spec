import { createClient } from '@/lib/supabase/server'
import type { User } from '@/types/user'

/**
 * Gets the current authenticated user from server-side context.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()

  if (error || !authUser) {
    return null
  }

  // Fetch user profile from public.users
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single()

  if (profileError || !userProfile) {
    return null
  }

  return userProfile as User
}

/**
 * Requires authentication. Throws error if not authenticated.
 * Use in Server Actions and API routes.
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Gets the current user's session.
 */
export async function getSession() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
