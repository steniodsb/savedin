-- Add 'overdue' status to invoices
ALTER TABLE savedin.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE savedin.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('open', 'closed', 'paid', 'overdue'));
