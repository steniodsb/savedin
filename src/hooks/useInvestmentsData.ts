import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Investment, InvestmentEntry } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useInvestmentsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: investments = [], isLoading: investmentsLoading } = useQuery({
    queryKey: ['savedin-investments', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('investments')
        .select('*')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) { console.warn('savedin.investments:', error.message); return []; }
      return (data || []) as Investment[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['savedin-investment-entries', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('investment_entries')
        .select('*')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) { console.warn('savedin.investment_entries:', error.message); return []; }
      return (data || []) as InvestmentEntry[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const isLoading = investmentsLoading || entriesLoading;

  // Calculations
  const totalPatrimony = investments.filter(i => i.is_active).reduce((s, i) => s + Number(i.current_value), 0);
  const totalInvested = investments.filter(i => i.is_active).reduce((s, i) => s + Number(i.invested_amount), 0);
  const totalYield = totalPatrimony - totalInvested;
  const totalYieldPercent = totalInvested > 0 ? (totalYield / totalInvested) * 100 : 0;

  // Monthly yield (entries of type 'yield' this month)
  const now = new Date();
  const monthlyYield = entries
    .filter(e => {
      if (e.type !== 'yield') return false;
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  const getEntriesForInvestment = (investmentId: string) =>
    entries.filter(e => e.investment_id === investmentId);

  // CRUD
  const addInvestment = useMutation({
    mutationFn: async (investment: Omit<Investment, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('investments')
        .insert({ ...investment, user_id: user.id, environment_id: investment.environment_id || selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-investments'] });
      toast({ title: 'Investimento criado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar investimento', variant: 'destructive' });
    },
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Investment> }) => {
      const { data, error } = await savedinClient
        .from('investments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-investments'] });
      toast({ title: 'Investimento atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar investimento', variant: 'destructive' });
    },
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient.from('investments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-investments'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-investment-entries'] });
      toast({ title: 'Investimento removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover investimento', variant: 'destructive' });
    },
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<InvestmentEntry, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const envId = entry.environment_id || selectedEnvironmentId || defaultEnvironment?.id || '';

      // Insert entry
      const { data, error } = await savedinClient
        .from('investment_entries')
        .insert({ ...entry, user_id: user.id, environment_id: envId })
        .select()
        .single();
      if (error) throw error;

      // Update investment totals
      const investment = investments.find(i => i.id === entry.investment_id);
      if (investment) {
        let newInvested = Number(investment.invested_amount);
        let newCurrent = Number(investment.current_value);

        if (entry.type === 'deposit') {
          newInvested += Number(entry.amount);
          newCurrent += Number(entry.amount);
        } else if (entry.type === 'withdraw') {
          newInvested -= Number(entry.amount);
          newCurrent -= Number(entry.amount);
        } else if (entry.type === 'yield') {
          newCurrent += Number(entry.amount);
        }

        await savedinClient
          .from('investments')
          .update({ invested_amount: newInvested, current_value: newCurrent })
          .eq('id', entry.investment_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-investments'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-investment-entries'] });
      toast({ title: 'Movimentação registrada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao registrar movimentação', variant: 'destructive' });
    },
  });

  return {
    investments,
    entries,
    isLoading,
    totalPatrimony,
    totalInvested,
    totalYield,
    totalYieldPercent,
    monthlyYield,
    getEntriesForInvestment,
    addInvestment: addInvestment.mutateAsync,
    updateInvestment: updateInvestment.mutateAsync,
    deleteInvestment: deleteInvestment.mutateAsync,
    addEntry: addEntry.mutateAsync,
  };
}
