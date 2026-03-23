-- Adicionar campos de contribuição para metas na tabela de hábitos
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS contribution_type text DEFAULT 'none' 
CHECK (contribution_type IN ('none', 'simple', 'custom', 'milestone'));

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS contribution_value numeric DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.habits.contribution_type IS 'Tipo de contribuição para meta vinculada: none (apenas visual), simple (+1 por conclusão), custom (valor customizado), milestone (cria marco)';
COMMENT ON COLUMN public.habits.contribution_value IS 'Valor numérico da contribuição quando tipo é custom';