import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Budget } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useBudgetsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['savedin-budgets', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) { console.warn('savedin.budgets:', error.message); return []; }
      return (data || []) as Budget[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const getBudgetsForMonth = (month: number, year: number) => {
    return budgets.filter(b => b.month === month && b.year === year && b.is_active);
  };

  const addBudget = useMutation({
    mutationFn: async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'category' | 'spent'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('budgets')
        .insert({ ...budget, user_id: user.id, environment_id: selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-budgets'] });
      toast({ title: 'Orçamento criado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar orçamento', variant: 'destructive' });
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Budget> }) => {
      const { category, spent, ...cleanUpdates } = updates as any;
      const { data, error } = await savedinClient
        .from('budgets')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-budgets'] });
      toast({ title: 'Orçamento atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar orçamento', variant: 'destructive' });
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('budgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-budgets'] });
      toast({ title: 'Orçamento removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover orçamento', variant: 'destructive' });
    },
  });

  return {
    budgets,
    isLoading,
    getBudgetsForMonth,
    addBudget: addBudget.mutateAsync,
    updateBudget: updateBudget.mutateAsync,
    deleteBudget: deleteBudget.mutateAsync,
  };
}
