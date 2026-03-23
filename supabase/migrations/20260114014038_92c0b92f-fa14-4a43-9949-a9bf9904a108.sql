-- Add column to track goal direction (ascending = gain, descending = lose)
-- For goals like weight loss, the user wants to decrease the value
-- For goals like savings, the user wants to increase the value
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS is_descending boolean DEFAULT false;

COMMENT ON COLUMN public.goals.is_descending IS 'True for goals where lower values mean progress (e.g., weight loss), false for goals where higher values mean progress (e.g., savings)';