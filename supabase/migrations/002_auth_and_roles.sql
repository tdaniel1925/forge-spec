-- Migration 002: Auth & Roles
-- Stage 2: System Spine
-- Adds role management, auth triggers, and helper functions

-- =====================================================
-- ROLE MANAGEMENT
-- =====================================================

-- Roles enum (matching Gate 3)
CREATE TYPE user_role AS ENUM ('user', 'admin', 'system');

-- Add role column to users table with default 'user'
ALTER TABLE public.users
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Add index on role for permission queries
CREATE INDEX idx_users_role ON public.users(role);

-- =====================================================
-- SYSTEM LOGGING TABLE
-- =====================================================

-- System logs table for auth and system events (Stage 2 minimal logging)
-- Full event system will be implemented in Stage 5
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL, -- 'auth', 'system', etc.
  event_type TEXT NOT NULL, -- 'user_signed_up', 'user_signed_in', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying logs
CREATE INDEX idx_system_logs_log_type ON public.system_logs(log_type);
CREATE INDEX idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_logged_at ON public.system_logs(logged_at DESC);

COMMENT ON TABLE public.system_logs IS 'System logging for auth and system events (Stage 2). Full event system in Stage 5.';

-- =====================================================
-- AUTH TRIGGERS
-- =====================================================

-- Function: Update last_login_at on sign-in
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update last_login_at when auth.users session is created
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- Function: Create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_avatar TEXT;
  auth_method TEXT;
BEGIN
  -- Extract user metadata
  user_email := NEW.email;
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_avatar := NEW.raw_user_meta_data->>'avatar_url';

  -- Determine auth provider
  IF NEW.app_metadata->>'provider' = 'google' THEN
    auth_method := 'google';
  ELSE
    auth_method := 'email';
  END IF;

  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar_url,
    auth_provider,
    password_hash,
    role,
    signup_source,
    last_login_at,
    specs_generated,
    has_downloaded
  ) VALUES (
    NEW.id,
    user_email,
    user_name,
    user_avatar,
    auth_method,
    CASE WHEN auth_method = 'email' THEN 'hashed' ELSE NULL END, -- Placeholder, actual hashing done by Supabase Auth
    'user', -- Default role
    '', -- Will be populated from app on signup
    NOW(),
    0,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create user profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROLE HELPER FUNCTIONS
-- =====================================================

-- Function: Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = user_id;

  RETURN user_role_value = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(user_id, 'admin'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = auth.uid();

  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICY SETUP (AFTER FUNCTIONS ARE DEFINED)
-- =====================================================

-- RLS for system_logs (admin-only read access)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_logs_admin_read" ON public.system_logs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Service role can insert logs (bypasses RLS)

-- =====================================================
-- RLS POLICY UPDATES
-- =====================================================

-- Update RLS policy for users table to use role
-- Admins can see all users, regular users can only see themselves
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_admin(auth.uid())
  );

-- =====================================================
-- ADMIN SETUP (Optional - for development)
-- =====================================================

-- Function: Promote user to admin (can only be called by existing admin or in setup)
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_email TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin or if no admins exist yet (initial setup)
  IF public.is_admin(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin') THEN
    UPDATE public.users
    SET role = 'admin'
    WHERE email = target_user_email;
  ELSE
    RAISE EXCEPTION 'Only admins can promote users to admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.handle_user_login() IS 'Updates last_login_at timestamp when user signs in';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile in public.users when auth.users record is created';
COMMENT ON FUNCTION public.has_role(UUID, user_role) IS 'Checks if user has specified role';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Checks if user is an admin';
COMMENT ON FUNCTION public.current_user_role() IS 'Returns the current authenticated user role';
COMMENT ON FUNCTION public.promote_to_admin(TEXT) IS 'Promotes a user to admin role (admin-only or initial setup)';
