-- Corrigir search_path nas funções que não têm definido
CREATE OR REPLACE FUNCTION public.generate_username_from_name(full_name text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  IF full_name IS NOT NULL AND full_name != '' THEN
    base_username := lower(regexp_replace(full_name, '[^a-zA-Z0-9]', '_', 'g'));
    base_username := left(base_username, 15);
  ELSE
    base_username := 'user';
  END IF;
  
  final_username := base_username || '_' || left(user_id::text, 4);
  
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_task_hierarchy(task_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result uuid[];
  children uuid[];
  child_id uuid;
BEGIN
  result := ARRAY[task_id];
  
  SELECT children_ids INTO children FROM public.tasks WHERE id = task_id;
  
  IF children IS NOT NULL THEN
    FOREACH child_id IN ARRAY children LOOP
      result := result || public.get_task_hierarchy(child_id);
    END LOOP;
  END IF;
  
  RETURN result;
END;
$$;