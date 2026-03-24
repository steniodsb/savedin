import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { Environment } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

export function useEnvironmentsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autoCreatedRef = useRef(false);

  const { data: environments = [], isLoading } = useQuery({
    queryKey: ['savedin-environments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await savedinClient
        .from('environments')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) { console.warn('savedin.environments:', error.message); return []; }
      return (data || []) as Environment[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const defaultEnvironment = environments.find(e => e.is_default) || environments[0] || null;

  // Auto-create "Pessoal" default environment if none exist
  useEffect(() => {
    if (!user?.id || isLoading || autoCreatedRef.current) return;
    if (environments.length === 0) {
      autoCreatedRef.current = true;
      savedinClient
        .from('environments')
        .insert({ user_id: user.id, name: 'Pessoal', color: '#4CAF50', icon: 'User', is_default: true })
        .select()
        .single()
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['savedin-environments'] });
          }
        });
    }
  }, [user?.id, isLoading, environments.length]);

  const addEnvironment = useMutation({
    mutationFn: async (env: Omit<Environment, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('environments')
        .insert({ ...env, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-environments'] });
      toast({ title: 'Ambiente criado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar ambiente', variant: 'destructive' });
    },
  });

  const updateEnvironment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Environment> }) => {
      const { data, error } = await savedinClient
        .from('environments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-environments'] });
      toast({ title: 'Ambiente atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar ambiente', variant: 'destructive' });
    },
  });

  const deleteEnvironment = useMutation({
    mutationFn: async (id: string) => {
      const env = environments.find(e => e.id === id);
      if (env?.is_default) throw new Error('Não é possível deletar o ambiente padrão');
      const { error } = await savedinClient
        .from('environments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-environments'] });
      toast({ title: 'Ambiente removido!' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Erro ao remover ambiente', variant: 'destructive' });
    },
  });

  return {
    environments,
    defaultEnvironment,
    isLoading,
    addEnvironment: addEnvironment.mutateAsync,
    updateEnvironment: updateEnvironment.mutateAsync,
    deleteEnvironment: deleteEnvironment.mutateAsync,
  };
}
