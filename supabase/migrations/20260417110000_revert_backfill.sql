-- Reverte o backfill da migração 20260417100000
-- Deleta apenas as linhas inseridas pelo backfill:
--  - criadas nos últimos 30 minutos
--  - status pending
--  - com recurrence_group_id (backfill sempre seta)
DELETE FROM savedin.transactions
WHERE user_id = '114a6830-667a-4ad7-93f7-19238d6f1f34'
  AND created_at >= NOW() - INTERVAL '30 minutes'
  AND status = 'pending'
  AND recurrence_group_id IS NOT NULL;
