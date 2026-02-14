import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Next.js middleware for auth and route protection.
 * Runs on every request to check authentication and permissions.
 */
export async function middleware(request: NextRequest) {
  // Update session (refresh token if needed)
  let response = await updateSession(request)

  // Create supabase client for middleware
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public routes (accessible without auth)
  const publicRoutes = ['/', '/login', '/signup', '/reset-password']
  const isPublicRoute = publicRoutes.includes(path) || path.startsWith('/auth/')

  // Auth routes (should redirect if already logged in)
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(path)

  // Protected app routes
  const isAppRoute = path.startsWith('/dashboard') || path.startsWith('/spec') || path.startsWith('/settings')

  // Admin routes
  const isAdminRoute = path.startsWith('/admin')

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  if (!user && (isAppRoute || isAdminRoute)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin access for admin routes
  if (user && isAdminRoute) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
