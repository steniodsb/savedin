-- Create goal_progress_history table for tracking measurable goal updates
CREATE TABLE IF NOT EXISTS public.goal_progress_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  previous_value DECIMAL NOT NULL,
  new_value DECIMAL NOT NULL,
  difference DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_progress_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see history for their own goals
CREATE POLICY "Users can view progress history for their goals"
  ON public.goal_progress_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_progress_history.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert progress history for their goals"
  ON public.goal_progress_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_progress_history.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_goal_progress_history_goal_id ON public.goal_progress_history(goal_id);
CREATE INDEX idx_goal_progress_history_created_at ON public.goal_progress_history(created_at DESC);