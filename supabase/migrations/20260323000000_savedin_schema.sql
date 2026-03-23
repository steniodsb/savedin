-- ============================================
-- SaveDin Financial App - Schema Migration
-- ============================================

-- Create the savedin schema
CREATE SCHEMA IF NOT EXISTS savedin;

-- Contas bancárias
CREATE TABLE savedin.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'wallet', 'investment')),
  balance NUMERIC(12,2) DEFAULT 0,
  color TEXT DEFAULT '#4CAF50',
  icon TEXT DEFAULT 'Wallet',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cartões de crédito
CREATE TABLE savedin.credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color TEXT DEFAULT '#3F51B5',
  icon TEXT DEFAULT 'CreditCard',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Faturas dos cartões
CREATE TABLE savedin.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES savedin.credit_cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  total NUMERIC(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  UNIQUE(card_id, month, year)
);

-- Categorias
CREATE TABLE savedin.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  icon TEXT DEFAULT 'MoreHorizontal',
  color TEXT DEFAULT '#9E9E9E',
  bg TEXT DEFAULT '#F5F5F5',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE savedin.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#9E9E9E',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações
CREATE TABLE savedin.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES savedin.categories(id),
  account_id UUID REFERENCES savedin.accounts(id),
  card_id UUID REFERENCES savedin.credit_cards(id),
  invoice_id UUID REFERENCES savedin.invoices(id),
  tags UUID[],
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  installment_total INTEGER,
  installment_current INTEGER,
  registered_via TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orçamentos mensais
CREATE TABLE savedin.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES savedin.categories(id),
  monthly_limit NUMERIC(12,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objetivos financeiros
CREATE TABLE savedin.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#4CAF50',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE savedin.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.goals ENABLE ROW LEVEL SECURITY;

-- Policies (cada usuário vê só os próprios dados)
CREATE POLICY "user_owns" ON savedin.accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.credit_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.categories FOR ALL USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "user_owns" ON savedin.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.goals FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Categorias padrão (disponíveis para todos)
-- ============================================

INSERT INTO savedin.categories (name, slug, type, icon, color, bg, is_default, user_id) VALUES
  ('Moradia', 'moradia', 'expense', 'Home', '#607D8B', '#ECEFF1', true, NULL),
  ('Alimentação', 'alimentacao', 'expense', 'ShoppingCart', '#4CAF50', '#EAFBE7', true, NULL),
  ('Transporte', 'transporte', 'expense', 'Car', '#FF9800', '#FFF3E0', true, NULL),
  ('Saúde', 'saude', 'expense', 'Heart', '#F44336', '#FFEBEE', true, NULL),
  ('Lazer', 'lazer', 'expense', 'PartyPopper', '#FF5722', '#FBE9E7', true, NULL),
  ('Educação', 'educacao', 'expense', 'BookOpen', '#3F51B5', '#E8EAF6', true, NULL),
  ('Roupas', 'roupas', 'expense', 'Shirt', '#9C27B0', '#F3E5F5', true, NULL),
  ('Assinaturas', 'assinaturas', 'expense', 'CreditCard', '#2196F3', '#E3F2FD', true, NULL),
  ('Investimentos', 'investimentos', 'expense', 'TrendingUp', '#009688', '#E0F2F1', true, NULL),
  ('Outros', 'outros', 'expense', 'MoreHorizontal', '#9E9E9E', '#F5F5F5', true, NULL),
  ('Salário', 'salario', 'income', 'Briefcase', '#4CAF50', '#EAFBE7', true, NULL),
  ('Freelance', 'freelance', 'income', 'Laptop', '#2196F3', '#E3F2FD', true, NULL),
  ('Investimentos', 'investimentos_renda', 'income', 'TrendingUp', '#FF9800', '#FFF3E0', true, NULL),
  ('Outros', 'outros_renda', 'income', 'MoreHorizontal', '#9E9E9E', '#F5F5F5', true, NULL);
