import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuthEvent } from '@/lib/system/event-logger'

/**
 * Auth callback route for OAuth providers (Google).
 * Handles the redirect from OAuth provider and exchanges code for session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Log OAuth sign-in event
      await logAuthEvent('user_signed_in', data.user.id, {
        email: data.user.email,
        provider: 'google',
      })

      // Check if this is a new user (created in the last 10 seconds)
      const userCreatedAt = new Date(data.user.created_at)
      const now = new Date()
      const isNewUser = (now.getTime() - userCreatedAt.getTime()) / 1000 < 10

      if (isNewUser) {
        // Log sign-up event for new OAuth users
        await logAuthEvent('user_signed_up', data.user.id, {
          email: data.user.email,
          provider: 'google',
          signup_source: 'oauth',
        })
      }

      // Redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // If there was an error or no code, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
