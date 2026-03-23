-- Create goal_groups table for grouping goals
CREATE TABLE IF NOT EXISTS public.goal_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📁',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add group_id to goals table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.goals ADD COLUMN group_id UUID REFERENCES public.goal_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on goal_groups
ALTER TABLE public.goal_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_groups
CREATE POLICY "Users can view their own goal groups"
  ON public.goal_groups
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goal groups"
  ON public.goal_groups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal groups"
  ON public.goal_groups
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal groups"
  ON public.goal_groups
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on goal_groups
CREATE TRIGGER update_goal_groups_updated_at
  BEFORE UPDATE ON public.goal_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();