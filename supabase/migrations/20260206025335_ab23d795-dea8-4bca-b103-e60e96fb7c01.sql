-- Atualizar função para permitir visualizar perfis de conexões pendentes
-- (quando alguém te envia uma solicitação, você precisa ver o perfil dela)
CREATE OR REPLACE FUNCTION public.are_users_connected(user1_id uuid, user2_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status IN ('accepted', 'pending')
    AND (
      (requester_id = user1_id AND addressee_id = user2_id)
      OR (requester_id = user2_id AND addressee_id = user1_id)
    )
  );
$function$;

-- Adicionar política para permitir buscar perfis por username (para adicionar conexões)
CREATE POLICY "Authenticated users can search profiles by username"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Remover política duplicada se existir
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;