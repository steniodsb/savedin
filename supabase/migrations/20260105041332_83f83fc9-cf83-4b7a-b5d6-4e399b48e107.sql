-- Add tags column to projects table
ALTER TABLE public.projects 
ADD COLUMN tags text[] DEFAULT '{}'::text[];