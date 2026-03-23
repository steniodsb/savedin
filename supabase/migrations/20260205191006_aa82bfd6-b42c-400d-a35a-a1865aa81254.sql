-- Add Asaas customer ID and CPF/CNPJ to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS asaas_customer_id text,
ADD COLUMN IF NOT EXISTS cpf_cnpj text;

-- Add unique constraint to prevent duplicate webhook processing (using DO block to handle if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_history_provider_payment_id_key'
  ) THEN
    ALTER TABLE payment_history 
    ADD CONSTRAINT payment_history_provider_payment_id_key UNIQUE (provider_payment_id);
  END IF;
END $$;

-- Create function to check if user has premium access
CREATE OR REPLACE FUNCTION public.user_has_premium(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  ) OR EXISTS (
    SELECT 1 FROM duo_links dl
    JOIN subscriptions s ON s.id = dl.subscription_id
    WHERE dl.partner_user_id = user_uuid
    AND dl.invite_status = 'accepted'
    AND s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;