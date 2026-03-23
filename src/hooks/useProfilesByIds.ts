import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export function useProfilesByIds(userIds: string[]) {
  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['profiles', userIds],
    queryFn: async () => {
      if (!userIds || userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      if (error) throw error;

      return (data || []).map(p => ({
        userId: p.user_id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: userIds && userIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { profiles, isLoading, error };
}
