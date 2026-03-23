-- Update the handle_new_user function to generate a username automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_username text;
BEGIN
  -- Generate a unique username based on the full name or email
  generated_username := public.generate_username_from_name(
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.id
  );
  
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    generated_username
  );
  RETURN new;
END;
$$;