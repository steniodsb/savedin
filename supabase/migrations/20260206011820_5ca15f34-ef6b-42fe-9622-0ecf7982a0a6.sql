-- Add policy for admins to insert subscriptions for any user
CREATE POLICY "Admins can insert subscriptions for any user"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));