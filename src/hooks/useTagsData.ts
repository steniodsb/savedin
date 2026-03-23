import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { Tag } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useTagsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['savedin-tags', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await savedinClient
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) { console.warn('savedin.tags:', error.message); return []; }
      return (data || []) as Tag[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const addTag = useMutation({
    mutationFn: async (tag: Omit<Tag, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('tags')
        .insert({ ...tag, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-tags'] });
      toast({ title: 'Tag criada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tag', variant: 'destructive' });
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
      const { data, error } = await savedinClient
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-tags'] });
      toast({ title: 'Tag atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar tag', variant: 'destructive' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('tags')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-tags'] });
      toast({ title: 'Tag removida!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' });
    },
  });

  return {
    tags,
    isLoading,
    addTag: addTag.mutateAsync,
    updateTag: updateTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
  };
}
