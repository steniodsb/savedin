-- Add linked_goal_id column to habits table to allow habits to contribute to goals
ALTER TABLE public.habits ADD COLUMN linked_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_habits_linked_goal_id ON public.habits(linked_goal_id);

-- Update tasks with level='project' to level='milestone' since Project is now a separate entity
UPDATE public.tasks SET level = 'milestone', depth = GREATEST(0, depth - 1) WHERE level = 'project';