-- Adicionar coluna deleted_at em todas as tabelas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_deleted_at ON goals(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routines_deleted_at ON routines(deleted_at) WHERE deleted_at IS NOT NULL;

-- Função para limpar itens antigos (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_deleted_items()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tasks WHERE deleted_at < NOW() - INTERVAL '24 hours';
  DELETE FROM habits WHERE deleted_at < NOW() - INTERVAL '24 hours';
  DELETE FROM goals WHERE deleted_at < NOW() - INTERVAL '24 hours';
  DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '24 hours';
  DELETE FROM routines WHERE deleted_at < NOW() - INTERVAL '24 hours';
END;
$$;