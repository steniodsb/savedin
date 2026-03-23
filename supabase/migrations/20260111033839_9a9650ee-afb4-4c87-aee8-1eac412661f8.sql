-- Adicionar goal_type se não existir
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'project';

-- Atualizar goals existentes baseado em is_measurable
UPDATE goals SET goal_type = CASE 
  WHEN is_measurable = true THEN 'measurable' 
  ELSE 'project' 
END WHERE goal_type IS NULL OR goal_type = 'project';

-- Adicionar constraint para goal_type
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check 
  CHECK (goal_type IN ('project', 'measurable'));

-- Adicionar value_unit (já tem current_value e target_value)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS value_unit TEXT;

-- Adicionar scope
ALTER TABLE goals ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_scope_check;
ALTER TABLE goals ADD CONSTRAINT goals_scope_check 
  CHECK (scope IS NULL OR scope IN ('personal', 'professional', 'financial', 'health', 'relationship', 'education'));

-- Mapear category para scope
UPDATE goals SET scope = CASE category
  WHEN 'personal' THEN 'personal'
  WHEN 'career' THEN 'professional'
  WHEN 'finance' THEN 'financial'
  WHEN 'health' THEN 'health'
  WHEN 'relationships' THEN 'relationship'
  WHEN 'learning' THEN 'education'
  ELSE 'personal'
END WHERE scope IS NULL;

-- Migrar projects para goals com cast correto do status
INSERT INTO goals (
  user_id, title, description, icon, color, goal_type, 
  end_date, created_at, status, progress, depth, scope
)
SELECT 
  user_id, 
  title, 
  description, 
  COALESCE(icon, '📁'), 
  color, 
  'project',
  due_date,
  created_at,
  CASE WHEN is_archived THEN 'abandoned'::goal_status ELSE 'in_progress'::goal_status END,
  0,
  0,
  'professional'
FROM projects 
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_goals_user_type ON goals(user_id, goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_scope ON goals(scope);