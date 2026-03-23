-- Allow anyone to check if a username exists (for registration)
CREATE POLICY "Anyone can check username availability"
ON public.profiles
FOR SELECT
USING (true);