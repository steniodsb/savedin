-- Allow null for habit color to support system color
ALTER TABLE public.habits ALTER COLUMN color DROP NOT NULL;
ALTER TABLE public.habits ALTER COLUMN color SET DEFAULT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.habits.color IS 'Habit color. NULL means use system/theme color.';