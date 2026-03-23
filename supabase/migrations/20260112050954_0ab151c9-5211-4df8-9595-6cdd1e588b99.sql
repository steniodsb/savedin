-- Fix 1: Restrict cleanup_deleted_items() to service_role only
-- This prevents any authenticated user from deleting other users' trash

REVOKE EXECUTE ON FUNCTION public.cleanup_deleted_items() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_deleted_items() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_deleted_items() FROM anon;

-- Only service_role can execute this function (for scheduled jobs)
GRANT EXECUTE ON FUNCTION public.cleanup_deleted_items() TO service_role;

-- Fix 2: Create secure username check function and remove public profile access
-- This function only returns true/false, not any profile data

CREATE OR REPLACE FUNCTION public.check_username_exists(username_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE username = lower(username_to_check)
  );
$$;

-- Grant access to the function for anon and authenticated users
GRANT EXECUTE ON FUNCTION public.check_username_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_username_exists(text) TO authenticated;

-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check username availability" ON public.profiles;