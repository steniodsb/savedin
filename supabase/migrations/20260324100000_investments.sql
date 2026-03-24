-- ============================================
-- SaveDin - Investments
-- ============================================

CREATE TABLE savedin.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES savedin.environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('crypto', 'stocks', 'fixed_income', 'emergency', 'daytrade', 'other')),
  invested_amount NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  color TEXT DEFAULT '#4CAF50',
  icon TEXT DEFAULT 'TrendingUp',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE savedin.investment_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment_id UUID NOT NULL REFERENCES savedin.environments(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES savedin.investments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'yield')),
  amount NUMERIC(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE savedin.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.investment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns" ON savedin.investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_owns" ON savedin.investment_entries FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_investments_user ON savedin.investments(user_id);
CREATE INDEX idx_investments_env ON savedin.investments(environment_id);
CREATE INDEX idx_investment_entries_investment ON savedin.investment_entries(investment_id);
CREATE INDEX idx_investment_entries_env ON savedin.investment_entries(environment_id);

-- Grants
GRANT ALL ON savedin.investments TO anon, authenticated, service_role;
GRANT ALL ON savedin.investment_entries TO anon, authenticated, service_role;
