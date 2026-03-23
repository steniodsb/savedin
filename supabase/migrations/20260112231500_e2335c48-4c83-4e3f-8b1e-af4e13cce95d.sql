-- Add UPDATE policy for goal_progress_history
CREATE POLICY "Users can update progress history for their goals"
  ON public.goal_progress_history
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_progress_history.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- Add DELETE policy for goal_progress_history
CREATE POLICY "Users can delete progress history for their goals"
  ON public.goal_progress_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals 
      WHERE goals.id = goal_progress_history.goal_id 
      AND goals.user_id = auth.uid()
    )
  );