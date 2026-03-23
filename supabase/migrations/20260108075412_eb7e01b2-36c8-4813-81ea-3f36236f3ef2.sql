-- Add assignees column to tasks table (array of user IDs)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assignees uuid[] DEFAULT '{}';

-- Add assignees column to projects table (array of user IDs)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assignees uuid[] DEFAULT '{}';