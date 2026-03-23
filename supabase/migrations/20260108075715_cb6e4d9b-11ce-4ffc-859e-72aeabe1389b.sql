-- Allow users to view profiles when they are assignees on the same tasks/projects
-- This enables viewing collaborator avatars on shared items
CREATE POLICY "Users can view assignee profiles"
ON public.profiles
FOR SELECT
USING (
  -- User is an assignee on any task that includes this profile's user_id
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE auth.uid() = ANY(assignees) 
    AND user_id = ANY(assignees)
  )
  OR
  -- User is an assignee on any project that includes this profile's user_id
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE auth.uid() = ANY(assignees) 
    AND user_id = ANY(assignees)
  )
);