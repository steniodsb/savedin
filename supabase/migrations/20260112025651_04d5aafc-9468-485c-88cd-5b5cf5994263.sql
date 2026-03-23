-- Add color column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Add recurrence columns for future use
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'once';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_interval_unit TEXT DEFAULT NULL;