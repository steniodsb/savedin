-- Adicionar novas colunas à tabela habits para suportar tracking avançado
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS tracking_type TEXT DEFAULT 'simple';
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS target_value DECIMAL DEFAULT NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS custom_unit TEXT DEFAULT NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS checklist_items TEXT[] DEFAULT NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS require_all_items BOOLEAN DEFAULT false;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT NULL;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS times_per_week INTEGER DEFAULT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.habits.tracking_type IS 'Tipo de registro: simple, quantitative, checklist';
COMMENT ON COLUMN public.habits.target_value IS 'Valor meta para hábitos quantitativos';
COMMENT ON COLUMN public.habits.unit IS 'Unidade de medida: minutes, hours, liters, km, etc';
COMMENT ON COLUMN public.habits.checklist_items IS 'Lista de itens para hábitos do tipo checklist';
COMMENT ON COLUMN public.habits.require_all_items IS 'Se verdadeiro, exige todos os itens do checklist';
COMMENT ON COLUMN public.habits.times_per_week IS 'Número de vezes por semana para frequência times_per_week';