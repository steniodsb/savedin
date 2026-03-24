-- ============================================
-- SaveDin - Transaction Status + Filters
-- ============================================

-- Add status field to transactions
ALTER TABLE savedin.transactions ADD COLUMN status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'overdue'));

-- Index for filtering
CREATE INDEX idx_transactions_status ON savedin.transactions(status);
CREATE INDEX idx_transactions_date ON savedin.transactions(date);
CREATE INDEX idx_transactions_type ON savedin.transactions(type);
