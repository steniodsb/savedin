-- Add icon column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS icon text DEFAULT '✅';

-- Add icon column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS icon text DEFAULT '📁';