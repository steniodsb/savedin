-- Add notification preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences jsonb DEFAULT '{"overdueTasks": true, "upcomingDeadlines": true, "habitReminders": true, "goalProgress": true}'::jsonb;