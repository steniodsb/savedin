
-- Revoke SELECT on admin_subscription_metrics from authenticated users
-- Only service_role (used in admin edge functions) should access this view
REVOKE SELECT ON public.admin_subscription_metrics FROM authenticated;
REVOKE SELECT ON public.admin_subscription_metrics FROM anon;
