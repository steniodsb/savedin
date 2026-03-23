
-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('goal', 'task', 'habit', 'project')),
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id, type, name)
);

-- Índices
CREATE INDEX idx_categories_user_type ON categories(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_sort ON categories(user_id, type, sort_order);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar category_id às tabelas existentes
ALTER TABLE goals ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);

-- Função para criar categorias padrão para novo usuário
CREATE OR REPLACE FUNCTION create_default_categories(user_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Categorias de Metas
  INSERT INTO categories (user_id, name, icon, color, type, is_system, sort_order) VALUES
    (user_id_param, 'Pessoal', '🌟', '#3B82F6', 'goal', true, 0),
    (user_id_param, 'Carreira', '💼', '#8B5CF6', 'goal', true, 1),
    (user_id_param, 'Saúde', '💪', '#10B981', 'goal', true, 2),
    (user_id_param, 'Financeiro', '💰', '#F59E0B', 'goal', true, 3),
    (user_id_param, 'Aprendizado', '📚', '#EC4899', 'goal', true, 4),
    (user_id_param, 'Relacionamentos', '❤️', '#EF4444', 'goal', true, 5)
  ON CONFLICT (user_id, type, name) DO NOTHING;
  
  -- Categorias de Tarefas
  INSERT INTO categories (user_id, name, icon, color, type, is_system, sort_order) VALUES
    (user_id_param, 'Trabalho', '💼', '#8B5CF6', 'task', true, 0),
    (user_id_param, 'Casa', '🏠', '#10B981', 'task', true, 1),
    (user_id_param, 'Estudos', '📚', '#3B82F6', 'task', true, 2),
    (user_id_param, 'Pessoal', '✨', '#EC4899', 'task', true, 3)
  ON CONFLICT (user_id, type, name) DO NOTHING;
  
  -- Categorias de Hábitos
  INSERT INTO categories (user_id, name, icon, color, type, is_system, sort_order) VALUES
    (user_id_param, 'Saúde', '💪', '#10B981', 'habit', true, 0),
    (user_id_param, 'Produtividade', '⚡', '#F59E0B', 'habit', true, 1),
    (user_id_param, 'Bem-estar', '🧘', '#8B5CF6', 'habit', true, 2),
    (user_id_param, 'Social', '👥', '#EC4899', 'habit', true, 3)
  ON CONFLICT (user_id, type, name) DO NOTHING;
  
  -- Categorias de Projetos
  INSERT INTO categories (user_id, name, icon, color, type, is_system, sort_order) VALUES
    (user_id_param, 'Trabalho', '💼', '#8B5CF6', 'project', true, 0),
    (user_id_param, 'Pessoal', '✨', '#3B82F6', 'project', true, 1),
    (user_id_param, 'Side Project', '🚀', '#F59E0B', 'project', true, 2)
  ON CONFLICT (user_id, type, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
