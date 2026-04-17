-- Add due_date column to transactions for custom due dates
ALTER TABLE savedin.transactions ADD COLUMN IF NOT EXISTS due_date DATE;
