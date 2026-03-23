-- Rename yearly_goals to goals (more general)
ALTER TABLE public.yearly_goals RENAME TO goals;

-- Add new columns for flexible dates and hierarchy
ALTER TABLE public.goals 
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN parent_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
ADD COLUMN depth integer NOT NULL DEFAULT 0,
ADD COLUMN children_ids uuid[] DEFAULT '{}'::uuid[];

-- Drop the year column as we now use flexible dates
ALTER TABLE public.goals DROP COLUMN year;

-- Update foreign key reference in goal_milestones
ALTER TABLE public.goal_milestones 
DROP CONSTRAINT goal_milestones_goal_id_fkey,
ADD CONSTRAINT goal_milestones_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;

-- Update foreign key reference in tasks
ALTER TABLE public.tasks
DROP CONSTRAINT tasks_linked_goal_id_fkey,
ADD CONSTRAINT tasks_linked_goal_id_fkey 
FOREIGN KEY (linked_goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;

-- Add weight column to tasks for goal contribution
ALTER TABLE public.tasks
ADD COLUMN goal_weight integer DEFAULT NULL;

-- Update RLS policies to reference new table name
-- Drop old policies
DROP POLICY IF EXISTS "Users can create their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;

-- Recreate policies
CREATE POLICY "Users can create their own goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.goals 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update goal_milestones policies to use new table name
DROP POLICY IF EXISTS "Users can create their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can delete their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can update their own goal milestones" ON public.goal_milestones;
DROP POLICY IF EXISTS "Users can view their own goal milestones" ON public.goal_milestones;

CREATE POLICY "Users can create their own goal milestones" 
ON public.goal_milestones 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()));

CREATE POLICY "Users can delete their own goal milestones" 
ON public.goal_milestones 
FOR DELETE 
USING (EXISTS ( SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()));

CREATE POLICY "Users can update their own goal milestones" 
ON public.goal_milestones 
FOR UPDATE 
USING (EXISTS ( SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()));

CREATE POLICY "Users can view their own goal milestones" 
ON public.goal_milestones 
FOR SELECT 
USING (EXISTS ( SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()));