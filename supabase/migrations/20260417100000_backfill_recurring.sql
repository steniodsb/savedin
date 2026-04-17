-- Backfill recurring transactions that don't have future occurrences
-- For each recurring transaction without a proper group (or with incomplete group),
-- generate the missing future months

DO $$
DECLARE
  rec RECORD;
  target_count INT;
  current_count INT;
  i INT;
  new_date DATE;
  new_due_date DATE;
  group_id UUID;
  base_date DATE;
  base_due_date DATE;
BEGIN
  -- Handle recurring transactions
  FOR rec IN
    SELECT DISTINCT ON (COALESCE(recurrence_group_id::text, id::text))
      id, user_id, environment_id, account_id, card_id, category_id,
      type, amount, description, date, due_date, status, paid_at,
      is_recurring, recurrence_type, recurrence_group_id,
      installment_current, installment_total, tags, notes
    FROM savedin.transactions
    WHERE is_recurring = true
      AND recurrence_type IS NOT NULL
      AND user_id = '114a6830-667a-4ad7-93f7-19238d6f1f34'
    ORDER BY COALESCE(recurrence_group_id::text, id::text), date ASC
  LOOP
    target_count := CASE rec.recurrence_type
      WHEN 'daily' THEN 90
      WHEN 'weekly' THEN 52
      WHEN 'monthly' THEN 12
      WHEN 'yearly' THEN 5
      ELSE 12
    END;

    IF rec.recurrence_group_id IS NULL THEN
      group_id := gen_random_uuid();
      UPDATE savedin.transactions SET recurrence_group_id = group_id WHERE id = rec.id;
      current_count := 1;
    ELSE
      group_id := rec.recurrence_group_id;
      SELECT COUNT(*) INTO current_count
        FROM savedin.transactions
        WHERE recurrence_group_id = group_id;
    END IF;

    IF current_count >= target_count THEN
      CONTINUE;
    END IF;

    base_date := rec.date;
    base_due_date := rec.due_date;

    FOR i IN current_count..(target_count - 1) LOOP
      new_date := CASE rec.recurrence_type
        WHEN 'daily' THEN base_date + (i || ' days')::interval
        WHEN 'weekly' THEN base_date + (i * 7 || ' days')::interval
        WHEN 'monthly' THEN base_date + (i || ' months')::interval
        WHEN 'yearly' THEN base_date + (i || ' years')::interval
      END;

      IF base_due_date IS NOT NULL THEN
        new_due_date := CASE rec.recurrence_type
          WHEN 'daily' THEN base_due_date + (i || ' days')::interval
          WHEN 'weekly' THEN base_due_date + (i * 7 || ' days')::interval
          WHEN 'monthly' THEN base_due_date + (i || ' months')::interval
          WHEN 'yearly' THEN base_due_date + (i || ' years')::interval
        END;
      ELSE
        new_due_date := NULL;
      END IF;

      -- Skip if a transaction already exists for this group+date
      IF EXISTS (
        SELECT 1 FROM savedin.transactions
        WHERE recurrence_group_id = group_id AND date = new_date
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO savedin.transactions (
        user_id, environment_id, account_id, card_id, category_id,
        type, amount, description, date, due_date, status, paid_at,
        is_recurring, recurrence_type, recurrence_group_id,
        installment_current, installment_total, tags, notes
      ) VALUES (
        rec.user_id, rec.environment_id, rec.account_id, rec.card_id, rec.category_id,
        rec.type, rec.amount, rec.description, new_date, new_due_date, 'pending', NULL,
        rec.is_recurring, rec.recurrence_type, group_id,
        rec.installment_current, rec.installment_total, rec.tags, rec.notes
      );
    END LOOP;
  END LOOP;

  -- Handle installment transactions that are incomplete
  FOR rec IN
    SELECT DISTINCT ON (recurrence_group_id)
      id, user_id, environment_id, account_id, card_id, category_id,
      type, amount, description, date, due_date, status,
      installment_current, installment_total, recurrence_group_id, tags, notes
    FROM savedin.transactions
    WHERE installment_total IS NOT NULL
      AND installment_current IS NOT NULL
      AND recurrence_group_id IS NOT NULL
      AND user_id = '114a6830-667a-4ad7-93f7-19238d6f1f34'
    ORDER BY recurrence_group_id, installment_current ASC
  LOOP
    SELECT COUNT(*) INTO current_count
      FROM savedin.transactions
      WHERE recurrence_group_id = rec.recurrence_group_id;

    IF current_count >= (rec.installment_total - rec.installment_current + 1) THEN
      CONTINUE;
    END IF;

    FOR i IN rec.installment_current..rec.installment_total LOOP
      new_date := rec.date + ((i - rec.installment_current) || ' months')::interval;

      IF EXISTS (
        SELECT 1 FROM savedin.transactions
        WHERE recurrence_group_id = rec.recurrence_group_id AND installment_current = i
      ) THEN
        CONTINUE;
      END IF;

      IF rec.due_date IS NOT NULL AND rec.card_id IS NULL THEN
        new_due_date := rec.due_date + ((i - rec.installment_current) || ' months')::interval;
      ELSE
        new_due_date := NULL;
      END IF;

      INSERT INTO savedin.transactions (
        user_id, environment_id, account_id, card_id, category_id,
        type, amount, description, date, due_date, status,
        is_recurring, installment_current, installment_total, recurrence_group_id, tags, notes
      ) VALUES (
        rec.user_id, rec.environment_id, rec.account_id, rec.card_id, rec.category_id,
        rec.type, rec.amount,
        CASE WHEN rec.card_id IS NULL AND rec.description IS NOT NULL
          THEN regexp_replace(rec.description, '\(\d+/\d+\)', '(' || i || '/' || rec.installment_total || ')')
          ELSE rec.description
        END,
        new_date, new_due_date, 'pending',
        false, i, rec.installment_total, rec.recurrence_group_id, rec.tags, rec.notes
      );
    END LOOP;
  END LOOP;
END $$;
