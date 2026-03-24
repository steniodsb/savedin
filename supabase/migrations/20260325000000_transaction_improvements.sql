-- ============================================
-- SaveDin - Transaction Improvements
-- ============================================

-- Payment tracking
ALTER TABLE savedin.transactions ADD COLUMN paid_at TIMESTAMPTZ;

-- Group recurring/installment transactions
ALTER TABLE savedin.transactions ADD COLUMN recurrence_group_id UUID;
CREATE INDEX idx_transactions_recurrence_group ON savedin.transactions(recurrence_group_id);
