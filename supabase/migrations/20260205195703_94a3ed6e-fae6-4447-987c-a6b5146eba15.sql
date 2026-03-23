-- Add onboarding_completed column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add onboarding_completed_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

-- Comment explaining the field
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the initial onboarding flow';