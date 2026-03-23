-- Permitir valor NULL na coluna color da tabela goals para suportar "Cor do sistema"
ALTER TABLE public.goals ALTER COLUMN color DROP NOT NULL;

-- Definir valor padrão como NULL (cor do sistema)
ALTER TABLE public.goals ALTER COLUMN color SET DEFAULT NULL;