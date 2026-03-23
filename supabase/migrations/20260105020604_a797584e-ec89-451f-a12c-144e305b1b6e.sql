-- Create enum types for better data integrity
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_level AS ENUM ('project', 'milestone', 'task', 'subtask');
CREATE TYPE habit_color AS ENUM ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink');
CREATE TYPE time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'anytime');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'specific_days', 'interval');
CREATE TYPE goal_category AS ENUM ('career', 'health', 'finance', 'learning', 'personal', 'relationships');
CREATE TYPE goal_status AS ENUM ('not_started', 'in_progress', 'achieved', 'abandoned');

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  level task_level NOT NULL DEFAULT 'task',
  level_label TEXT NOT NULL DEFAULT 'Tarefa',
  due_date DATE,
  start_date DATE,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  dependencies UUID[] DEFAULT '{}',
  dependents UUID[] DEFAULT '{}',
  blocked_by UUID[] DEFAULT '{}',
  children_ids UUID[] DEFAULT '{}',
  children_count INTEGER NOT NULL DEFAULT 0,
  completed_children_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_for DATE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  linked_goal_id UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- Habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '⭐',
  color habit_color NOT NULL DEFAULT 'blue',
  frequency habit_frequency NOT NULL DEFAULT 'daily',
  days_of_week INTEGER[] DEFAULT '{}',
  interval_days INTEGER,
  times_per_day INTEGER NOT NULL DEFAULT 1,
  time_of_day time_of_day NOT NULL DEFAULT 'anytime',
  specific_time TIME,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  goal_type TEXT,
  goal_target INTEGER,
  routine_id UUID,
  order_in_routine INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Habit logs table
CREATE TABLE public.habit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5)
);

-- Routines table
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '📋',
  time_of_day time_of_day NOT NULL DEFAULT 'morning',
  habit_ids UUID[] DEFAULT '{}',
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  allow_skip BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Yearly goals table
CREATE TABLE public.yearly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category goal_category NOT NULL DEFAULT 'personal',
  icon TEXT NOT NULL DEFAULT '🎯',
  color TEXT NOT NULL DEFAULT 'blue',
  is_measurable BOOLEAN NOT NULL DEFAULT false,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT,
  linked_project_ids UUID[] DEFAULT '{}',
  status goal_status NOT NULL DEFAULT 'not_started',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  achieved_at TIMESTAMP WITH TIME ZONE
);

-- Goal milestones table
CREATE TABLE public.goal_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.yearly_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4),
  month INTEGER CHECK (month >= 1 AND month <= 12),
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_logs
CREATE POLICY "Users can view their own habit logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own habit logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habit logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for routines
CREATE POLICY "Users can view their own routines" ON public.routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for yearly_goals
CREATE POLICY "Users can view their own goals" ON public.yearly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own goals" ON public.yearly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.yearly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.yearly_goals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for goal_milestones (via goal ownership)
CREATE POLICY "Users can view their own goal milestones" ON public.goal_milestones 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.yearly_goals WHERE id = goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their own goal milestones" ON public.goal_milestones 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.yearly_goals WHERE id = goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own goal milestones" ON public.goal_milestones 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.yearly_goals WHERE id = goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own goal milestones" ON public.goal_milestones 
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.yearly_goals WHERE id = goal_id AND user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_scheduled_for ON public.tasks(scheduled_for);
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_routine_id ON public.habits(routine_id);
CREATE INDEX idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(date);
CREATE INDEX idx_routines_user_id ON public.routines(user_id);
CREATE INDEX idx_yearly_goals_user_id ON public.yearly_goals(user_id);
CREATE INDEX idx_yearly_goals_year ON public.yearly_goals(year);
CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

-- Update tasks linked_goal_id foreign key
ALTER TABLE public.tasks ADD CONSTRAINT tasks_linked_goal_id_fkey 
  FOREIGN KEY (linked_goal_id) REFERENCES public.yearly_goals(id) ON DELETE SET NULL;

-- Update habits routine_id foreign key  
ALTER TABLE public.habits ADD CONSTRAINT habits_routine_id_fkey 
  FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE SET NULL;