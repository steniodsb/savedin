-- Remove duplicate transactions created during recurring/installment debug sessions.
-- Strategy: for each (user_id, description, amount, date, type, COALESCE(card_id), COALESCE(account_id)),
-- keep only the row with the earliest created_at. Everything else gets deleted.
--
-- This is safe because two transactions that match on all of those fields are effectively
-- the same transaction from the user's perspective.

WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        COALESCE(description, ''),
        amount,
        date,
        type,
        COALESCE(card_id::text, ''),
        COALESCE(account_id::text, ''),
        COALESCE(installment_current, 0)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM savedin.transactions
  WHERE user_id = '114a6830-667a-4ad7-93f7-19238d6f1f34'
)
DELETE FROM savedin.transactions
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
