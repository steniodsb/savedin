-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⏰',
  
  -- Tipo e conexão
  type TEXT NOT NULL DEFAULT 'standalone' CHECK (type IN ('standalone', 'task', 'habit', 'goal')),
  linked_item_id UUID,
  
  -- Configuração de recorrência
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('once', 'daily', 'weekly', 'custom')),
  custom_days INTEGER[],
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  
  -- Duração
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  total_days INTEGER,
  
  -- Status e tracking
  is_active BOOLEAN DEFAULT true,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tabela de histórico de completions
CREATE TABLE IF NOT EXISTS public.reminder_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON public.reminders(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reminders_deleted ON public.reminders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminder_completions_reminder ON public.reminder_completions(reminder_id);

-- RLS Policies
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own completions"
  ON public.reminder_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions"
  ON public.reminder_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON public.reminder_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();