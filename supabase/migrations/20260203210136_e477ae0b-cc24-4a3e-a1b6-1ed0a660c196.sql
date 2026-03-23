-- Adicionar coluna end_date à tabela habits para data de finalização do hábito
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL;

COMMENT ON COLUMN public.habits.end_date IS 'Optional end date for the habit - when the habit should stop';
