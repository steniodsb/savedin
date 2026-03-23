-- Adicionar coluna para rastrear última alteração do username
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username_updated_at timestamptz DEFAULT NULL;