-- Fase 1: Adicionar username na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Criar índice para busca rápida por username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Função para gerar username automático para usuários existentes
CREATE OR REPLACE FUNCTION public.generate_username_from_name(full_name text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Gerar base do username a partir do nome ou usar 'user'
  IF full_name IS NOT NULL AND full_name != '' THEN
    base_username := lower(regexp_replace(full_name, '[^a-zA-Z0-9]', '_', 'g'));
    base_username := left(base_username, 15);
  ELSE
    base_username := 'user';
  END IF;
  
  -- Adicionar sufixo único baseado no user_id
  final_username := base_username || '_' || left(user_id::text, 4);
  
  -- Verificar unicidade e adicionar contador se necessário
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Atualizar usuários existentes que não têm username
UPDATE public.profiles 
SET username = public.generate_username_from_name(full_name, user_id)
WHERE username IS NULL;

-- Tornar username NOT NULL após preencher valores existentes
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

-- Fase 2: Criar tabela de conexões entre usuários
CREATE TABLE IF NOT EXISTS public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Índices para buscas eficientes
CREATE INDEX IF NOT EXISTS idx_user_connections_requester ON public.user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_addressee ON public.user_connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON public.user_connections(status);

-- Habilitar RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_connections
CREATE POLICY "Users can view their own connections"
ON public.user_connections
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create connection requests"
ON public.user_connections
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they received"
ON public.user_connections
FOR UPDATE
USING (auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own connections"
ON public.user_connections
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fase 3: Criar tabela de itens compartilhados
CREATE TABLE IF NOT EXISTS public.shared_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('task', 'goal')),
  owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  permission text NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, item_type, shared_with_id),
  CHECK (owner_id != shared_with_id)
);

-- Índices para buscas eficientes
CREATE INDEX IF NOT EXISTS idx_shared_items_owner ON public.shared_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_shared_with ON public.shared_items(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_item ON public.shared_items(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_shared_items_status ON public.shared_items(status);

-- Habilitar RLS
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shared_items
CREATE POLICY "Users can view shared items they own or received"
ON public.shared_items
FOR SELECT
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can create shares for items they own"
ON public.shared_items
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares they received"
ON public.shared_items
FOR UPDATE
USING (auth.uid() = shared_with_id OR auth.uid() = owner_id);

CREATE POLICY "Users can delete shares they own"
ON public.shared_items
FOR DELETE
USING (auth.uid() = owner_id);

-- Função para verificar se dois usuários estão conectados
CREATE OR REPLACE FUNCTION public.are_users_connected(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND (
      (requester_id = user1_id AND addressee_id = user2_id)
      OR (requester_id = user2_id AND addressee_id = user1_id)
    )
  );
$$;

-- Função para buscar todas as subtarefas de uma tarefa (hierarquia completa)
CREATE OR REPLACE FUNCTION public.get_task_hierarchy(task_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result uuid[];
  children uuid[];
  child_id uuid;
BEGIN
  result := ARRAY[task_id];
  
  -- Buscar children_ids da tarefa
  SELECT children_ids INTO children FROM public.tasks WHERE id = task_id;
  
  IF children IS NOT NULL THEN
    FOREACH child_id IN ARRAY children LOOP
      result := result || public.get_task_hierarchy(child_id);
    END LOOP;
  END IF;
  
  RETURN result;
END;
$$;

-- Função auxiliar para verificar acesso a uma tarefa (dono ou compartilhada aceita)
CREATE OR REPLACE FUNCTION public.has_task_access(task_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_uuid AND user_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.shared_items 
    WHERE item_id = task_uuid 
    AND item_type = 'task' 
    AND shared_with_id = user_uuid 
    AND status = 'accepted'
  );
$$;

-- Função auxiliar para verificar acesso a uma meta (dono ou compartilhada aceita)
CREATE OR REPLACE FUNCTION public.has_goal_access(goal_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.goals WHERE id = goal_uuid AND user_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.shared_items 
    WHERE item_id = goal_uuid 
    AND item_type = 'goal' 
    AND shared_with_id = user_uuid 
    AND status = 'accepted'
  );
$$;