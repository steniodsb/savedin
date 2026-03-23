import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { FinancialGoal } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useFinancialGoalsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['savedin-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await savedinClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) { console.warn('savedin.goals:', error.message); return []; }
      return (data || []) as FinancialGoal[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);

  const addGoal = useMutation({
    mutationFn: async (goal: Omit<FinancialGoal, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-goals'] });
      toast({ title: 'Objetivo criado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar objetivo', variant: 'destructive' });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialGoal> }) => {
      const { data, error } = await savedinClient
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-goals'] });
      toast({ title: 'Objetivo atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar objetivo', variant: 'destructive' });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-goals'] });
      toast({ title: 'Objetivo removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover objetivo', variant: 'destructive' });
    },
  });

  const depositToGoal = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const goal = goals.find(g => g.id === id);
      if (!goal) throw new Error('Goal not found');
      const newAmount = Number(goal.current_amount) + amount;
      const isCompleted = newAmount >= Number(goal.target_amount);
      const { data, error } = await savedinClient
        .from('goals')
        .update({ current_amount: newAmount, is_completed: isCompleted })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['savedin-goals'] });
      if (data.is_completed) {
        toast({ title: 'Objetivo concluído! Parabéns!' });
      } else {
        toast({ title: 'Depósito realizado!' });
      }
    },
    onError: () => {
      toast({ title: 'Erro ao depositar', variant: 'destructive' });
    },
  });

  return {
    goals,
    activeGoals,
    completedGoals,
    totalSaved,
    totalTarget,
    isLoading,
    addGoal: addGoal.mutateAsync,
    updateGoal: updateGoal.mutateAsync,
    deleteGoal: deleteGoal.mutateAsync,
    depositToGoal: depositToGoal.mutateAsync,
  };
}
