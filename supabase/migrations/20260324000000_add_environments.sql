-- ============================================
-- SaveDin - Multi-Environment (Workspaces)
-- ============================================

-- 1. Create environments table
CREATE TABLE savedin.environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4CAF50',
  icon TEXT DEFAULT 'Briefcase',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savedin.environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns" ON savedin.environments FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON savedin.environments TO anon, authenticated, service_role;

-- 2. Create default "Pessoal" environment for each existing user
INSERT INTO savedin.environments (user_id, name, color, icon, is_default)
SELECT DISTINCT sub.user_id, 'Pessoal', '#4CAF50', 'User', true
FROM (
  SELECT user_id FROM savedin.accounts
  UNION SELECT user_id FROM savedin.transactions
  UNION SELECT user_id FROM savedin.credit_cards
  UNION SELECT user_id FROM savedin.tags
  UNION SELECT user_id FROM savedin.budgets
  UNION SELECT user_id FROM savedin.goals
  UNION SELECT user_id FROM savedin.categories WHERE user_id IS NOT NULL
) sub
ON CONFLICT DO NOTHING;

-- 3. Add environment_id column (nullable first) to all data tables
ALTER TABLE savedin.accounts ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.credit_cards ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.invoices ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.tags ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.transactions ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.budgets ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.goals ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;
ALTER TABLE savedin.categories ADD COLUMN environment_id UUID REFERENCES savedin.environments(id) ON DELETE CASCADE;

-- 4. Backfill: assign existing data to user's default environment
UPDATE savedin.accounts a SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = a.user_id AND e.is_default = true;

UPDATE savedin.credit_cards c SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = c.user_id AND e.is_default = true;

UPDATE savedin.invoices i SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = i.user_id AND e.is_default = true;

UPDATE savedin.tags t SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = t.user_id AND e.is_default = true;

UPDATE savedin.transactions t SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = t.user_id AND e.is_default = true;

UPDATE savedin.budgets b SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = b.user_id AND e.is_default = true;

UPDATE savedin.goals g SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = g.user_id AND e.is_default = true;

-- Categories: only backfill user-created ones (not is_default=true system categories)
UPDATE savedin.categories c SET environment_id = e.id
FROM savedin.environments e WHERE e.user_id = c.user_id AND c.user_id IS NOT NULL;

-- 5. Add NOT NULL constraint (except categories where is_default=true have NULL environment)
ALTER TABLE savedin.accounts ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.credit_cards ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.invoices ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.tags ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.transactions ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.budgets ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE savedin.goals ALTER COLUMN environment_id SET NOT NULL;
-- categories: environment_id stays nullable (NULL for system defaults)

-- 6. Indexes for performance
CREATE INDEX idx_environments_user ON savedin.environments(user_id);
CREATE INDEX idx_accounts_env ON savedin.accounts(environment_id);
CREATE INDEX idx_credit_cards_env ON savedin.credit_cards(environment_id);
CREATE INDEX idx_invoices_env ON savedin.invoices(environment_id);
CREATE INDEX idx_tags_env ON savedin.tags(environment_id);
CREATE INDEX idx_transactions_env ON savedin.transactions(environment_id);
CREATE INDEX idx_budgets_env ON savedin.budgets(environment_id);
CREATE INDEX idx_goals_env ON savedin.goals(environment_id);
CREATE INDEX idx_categories_env ON savedin.categories(environment_id);
