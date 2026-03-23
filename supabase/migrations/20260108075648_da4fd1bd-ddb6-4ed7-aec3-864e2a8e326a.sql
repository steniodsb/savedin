-- Allow users to view profiles of connected users for collaboration features
CREATE POLICY "Users can view profiles of connected users"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.are_users_connected(auth.uid(), user_id)
);