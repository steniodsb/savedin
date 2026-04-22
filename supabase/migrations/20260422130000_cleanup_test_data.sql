-- Limpeza de dados de teste e consolidação de duplicatas.
-- Executado em 2026-04-22 via Supabase Management API (service_role)
-- para o user_id '114a6830-667a-4ad7-93f7-19238d6f1f34'.
-- Idempotente: se as linhas/contas já não existem, a migration não faz nada.

-- 1) Deletar 3 grupos de transações recorrentes criados durante testes
DELETE FROM savedin.transactions
WHERE recurrence_group_id IN (
  'c63ed24c-5747-4220-9295-1df4b7d5187d',  -- "Teste" R$50 (12 linhas)
  '0f103af4-ba9e-4b93-ad2c-f243bc2e8cf8',  -- "50"    R$20 (60 linhas)
  '60eca114-68c2-4a5f-a7e1-ce95ef566524'   -- sem desc R$5 (60 linhas)
);

-- 2) Havia duas contas chamadas "Padrão" (6be48909 e cfacef46). Remapeia todas as
-- transações da duplicada para a canônica antes de deletá-la.
UPDATE savedin.transactions
SET account_id = 'cfacef46-001c-4084-8321-863bbf7d8680'
WHERE account_id = '6be48909-76b8-46f3-8d1d-10286e393910';

-- 3) Deletar conta "Padrão" duplicada e conta "teste"
DELETE FROM savedin.accounts
WHERE id IN (
  '6be48909-76b8-46f3-8d1d-10286e393910',  -- "Padrão" duplicada
  '98767d28-9a2a-4b2a-91c1-be80ca9365cc'   -- "teste"
);

-- 4) "Contador" R$167 tinha 2 grupos distintos (um por conta Padrão).
-- Após unificar as contas no passo 2, ficaram duplicados — mantém o grupo mais
-- antigo (1e3decd1) e deleta o outro.
DELETE FROM savedin.transactions
WHERE recurrence_group_id = '5269cd77-e00d-4a4f-b0d7-de28e63f4441';
