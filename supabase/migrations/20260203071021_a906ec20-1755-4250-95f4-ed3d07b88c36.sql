-- Add display preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_day_of_week integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format text DEFAULT '24h',
ADD COLUMN IF NOT EXISTS theme_mode text DEFAULT 'system';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.first_day_of_week IS '0 = Sunday, 1 = Monday';
COMMENT ON COLUMN public.profiles.date_format IS 'DD/MM/YYYY or MM/DD/YYYY';
COMMENT ON COLUMN public.profiles.time_format IS '24h or 12h';
COMMENT ON COLUMN public.profiles.theme_mode IS 'light, dark, or system';