'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logAuthEvent } from '@/lib/system/event-logger'

/**
 * Sign up with email and password (Gate 2 State Change #1)
 */
export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const signupSource = formData.get('signup_source') as string | undefined

  // Validate inputs
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = await createClient()

  // Sign up user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Update signup_source if provided
    if (signupSource) {
      await supabase
        .from('users')
        .update({ signup_source: signupSource })
        .eq('auth_id', data.user.id)
    }

    // Log auth event
    await logAuthEvent('user_signed_up', data.user.id, {
      email,
      provider: 'email',
      signup_source: signupSource || '',
    })
  }

  redirect('/dashboard')
}

/**
 * Sign in with email and password (Gate 2 State Change #3)
 */
export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Log auth event
    await logAuthEvent('user_signed_in', data.user.id, {
      email,
      provider: 'email',
    })
  }

  redirect('/dashboard')
}

/**
 * Sign in with Google OAuth (Gate 2 State Change #2)
 */
export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }

  return { error: 'Failed to initiate OAuth flow' }
}

/**
 * Sign out (Gate 2 State Change #4)
 */
export async function signOut() {
  const supabase = await createClient()

  // Get user before signing out for logging
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  if (user) {
    // Log auth event
    await logAuthEvent('user_signed_out', user.id, {})
  }

  redirect('/login')
}

/**
 * Request password reset (Gate 2 State Change #5)
 */
export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  // Log password reset request (no user_id since user is not authenticated)
  await logAuthEvent('password_reset_requested' as any, '', {
    email,
  })

  return { success: true }
}

/**
 * Update password after reset
 */
export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = await createClient()

  // Get user before updating password
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (user) {
    // Log password update event
    await logAuthEvent('password_updated' as any, user.id, {
      email: user.email,
    })
  }

  redirect('/dashboard')
}
