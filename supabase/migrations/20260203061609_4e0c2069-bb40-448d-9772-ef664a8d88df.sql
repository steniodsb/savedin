-- Add visual_effects_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS visual_effects_enabled boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.visual_effects_enabled IS 'Controls whether glassmorphism and glow effects are enabled in the UI';