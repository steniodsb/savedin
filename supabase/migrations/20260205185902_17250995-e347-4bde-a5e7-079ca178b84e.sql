-- ============================================
-- 1. TABELA: plans (Planos disponíveis)
-- ============================================
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL CHECK (type IN ('recurring', 'lifetime')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'once')),
  mode text NOT NULL CHECK (mode IN ('individual', 'duo')),
  price_cents integer NOT NULL,
  price_display text NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  trial_days integer DEFAULT 7,
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  savings_percentage integer DEFAULT 0,
  highlight boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (slug, mode)
);

-- ============================================
-- 2. TABELA: subscriptions (Assinaturas)
-- ============================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  payment_provider text DEFAULT 'asaas',
  provider_subscription_id text,
  provider_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamp with time zone,
  ended_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes para subscriptions
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan_id);

-- ============================================
-- 3. TABELA: duo_links (Vínculos DUO/Casal)
-- ============================================
CREATE TABLE public.duo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  partner_user_id uuid REFERENCES auth.users(id),
  invite_token text UNIQUE NOT NULL,
  invite_status text NOT NULL DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invite_email text,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (subscription_id),
  CHECK (owner_user_id != partner_user_id)
);

-- Indexes para duo_links
CREATE INDEX idx_duo_links_token ON public.duo_links(invite_token);
CREATE INDEX idx_duo_links_subscription ON public.duo_links(subscription_id);
CREATE INDEX idx_duo_links_partner ON public.duo_links(partner_user_id);
CREATE INDEX idx_duo_links_owner ON public.duo_links(owner_user_id);

-- ============================================
-- 4. TABELA: payment_history (Histórico)
-- ============================================
CREATE TABLE public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount_cents integer NOT NULL,
  amount_display text NOT NULL,
  currency text DEFAULT 'BRL',
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  payment_method text CHECK (payment_method IN ('credit_card', 'pix', 'boleto')),
  provider text DEFAULT 'asaas',
  provider_payment_id text,
  paid_at timestamp with time zone,
  invoice_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes para payment_history
CREATE INDEX idx_payment_user ON public.payment_history(user_id);
CREATE INDEX idx_payment_subscription ON public.payment_history(subscription_id);
CREATE INDEX idx_payment_status ON public.payment_history(status);

-- ============================================
-- 5. TRIGGERS para updated_at
-- ============================================
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- PLANS: Todos podem ver planos ativos
CREATE POLICY "Planos ativos são públicos"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- SUBSCRIPTIONS: Users veem apenas suas próprias
CREATE POLICY "Users podem ver suas subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users podem criar suas subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users podem atualizar suas subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- DUO_LINKS: Owner e Partner podem ver
CREATE POLICY "Users podem ver seus duo_links"
  ON public.duo_links FOR SELECT
  USING (
    auth.uid() = owner_user_id OR 
    auth.uid() = partner_user_id
  );

CREATE POLICY "Owner pode criar duo_link"
  ON public.duo_links FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owner pode atualizar duo_link"
  ON public.duo_links FOR UPDATE
  USING (auth.uid() = owner_user_id OR auth.uid() = partner_user_id);

-- PAYMENT_HISTORY: Users veem apenas seus pagamentos
CREATE POLICY "Users podem ver seus pagamentos"
  ON public.payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users podem criar seus pagamentos"
  ON public.payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. POPULAR PLANOS INICIAIS
-- ============================================
INSERT INTO public.plans (name, slug, type, billing_cycle, mode, price_cents, price_display, features, display_order, savings_percentage, highlight) VALUES
-- PLANOS INDIVIDUAIS
('Mensal', 'mensal', 'recurring', 'monthly', 'individual', 1497, 'R$ 14,97', 
 '["Hábitos ilimitados", "Metas e gráficos", "Todas funcionalidades", "Suporte padrão"]'::jsonb, 
 2, 0, false),

('Anual', 'anual', 'recurring', 'yearly', 'individual', 8790, 'R$ 87,90', 
 '["Hábitos ilimitados", "Metas e gráficos", "Todas funcionalidades", "Suporte prioritário"]'::jsonb, 
 1, 51, true),

('Vitalício', 'vitalicio', 'lifetime', 'once', 'individual', 14790, 'R$ 147,90', 
 '["Tudo do plano anual", "Acesso vitalício", "Atualizações futuras", "Suporte prioritário vitalício"]'::jsonb, 
 3, 0, false),

-- PLANOS DUO (CASAL)
('Mensal Duo', 'mensal', 'recurring', 'monthly', 'duo', 2290, 'R$ 22,90', 
 '["2 contas vinculadas", "Hábitos compartilhados", "Metas de casal", "Todas funcionalidades"]'::jsonb, 
 5, 0, false),

('Anual Duo', 'anual', 'recurring', 'yearly', 'duo', 13790, 'R$ 137,90', 
 '["2 contas vinculadas", "Hábitos compartilhados", "Metas de casal", "Suporte prioritário"]'::jsonb, 
 4, 52, true),

('Vitalício Duo', 'vitalicio', 'lifetime', 'once', 'duo', 23790, 'R$ 237,90', 
 '["2 contas vitalícias", "Hábitos compartilhados", "Metas de casal", "Suporte prioritário vitalício"]'::jsonb, 
 6, 0, false);