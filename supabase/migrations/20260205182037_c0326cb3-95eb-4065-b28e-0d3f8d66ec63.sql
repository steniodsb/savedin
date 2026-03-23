-- Adicionar política RLS para permitir visualizar tarefas compartilhadas
CREATE POLICY "Users can view shared tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_task_access(id, auth.uid())
);

-- Adicionar política para permitir atualizar tarefas compartilhadas
CREATE POLICY "Users can update shared tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_task_access(id, auth.uid())
);

-- Adicionar coluna para rastrear quem fez a última atualização
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_updated_at timestamp with time zone DEFAULT now();