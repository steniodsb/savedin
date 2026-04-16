-- ============================================
-- Delete all transactions for user steniodsb@gmail.com
-- ============================================

DELETE FROM savedin.transactions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'steniodsb@gmail.com'
);
