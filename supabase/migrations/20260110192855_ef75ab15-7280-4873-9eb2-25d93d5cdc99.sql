
-- Add timer fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

-- Add timer fields to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

-- Create timer_sessions table for history
CREATE TABLE IF NOT EXISTS timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('task', 'habit')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  estimated_time INTEGER,
  actual_time INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_item ON timer_sessions(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_date ON timer_sessions(user_id, started_at);

-- Enable RLS
ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own timer sessions"
  ON timer_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timer sessions"
  ON timer_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timer sessions"
  ON timer_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timer sessions"
  ON timer_sessions FOR DELETE
  USING (auth.uid() = user_id);
