import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Transaction } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useTransactionsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['savedin-transactions', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*), credit_card:credit_cards(*)')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) { console.warn('savedin.transactions:', error.message); return []; }
      return (data || []) as Transaction[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account' | 'credit_card'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('transactions')
        .insert({ ...transaction, user_id: user.id, environment_id: selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-invoices'] });
      toast({ title: 'Transação adicionada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar transação', variant: 'destructive' });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      // Remove joined fields before updating
      const { category, account, credit_card, ...cleanUpdates } = updates as any;
      const { data, error } = await savedinClient
        .from('transactions')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-invoices'] });
      toast({ title: 'Transação atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar transação', variant: 'destructive' });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['savedin-invoices'] });
      toast({ title: 'Transação removida!' });
    },
    onError: (error: any) => {
      console.error('Delete transaction error:', error);
      toast({ title: 'Erro ao remover transação', description: error?.message || '', variant: 'destructive' });
    },
  });

  const payTransaction = useMutation({
    mutationFn: async ({ id, paidAt }: { id: string; paidAt: string }) => {
      const { data, error } = await savedinClient
        .from('transactions')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-transactions'] });
      toast({ title: 'Transação marcada como paga!' });
    },
    onError: () => {
      toast({ title: 'Erro ao pagar transação', variant: 'destructive' });
    },
  });

  // Filters
  const getTransactionsByMonth = (month: number, year: number) => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  };

  const getMonthlyIncome = (month: number, year: number) => {
    return getTransactionsByMonth(month, year)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getMonthlyExpenses = (month: number, year: number) => {
    return getTransactionsByMonth(month, year)
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getExpensesByCategory = (month: number, year: number) => {
    const monthTransactions = getTransactionsByMonth(month, year).filter(t => t.type === 'expense');
    const byCategory: Record<string, { category: any; amount: number }> = {};

    monthTransactions.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      if (!byCategory[catId]) {
        byCategory[catId] = { category: t.category, amount: 0 };
      }
      byCategory[catId].amount += Number(t.amount);
    });

    const total = Object.values(byCategory).reduce((s, v) => s + v.amount, 0);
    return Object.values(byCategory).map(v => ({
      ...v,
      percentage: total > 0 ? (v.amount / total) * 100 : 0,
    }));
  };

  return {
    transactions,
    isLoading,
    addTransaction: addTransaction.mutateAsync,
    updateTransaction: updateTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    getTransactionsByMonth,
    getMonthlyIncome,
    getMonthlyExpenses,
    getExpensesByCategory,
    payTransaction: payTransaction.mutateAsync,
  };
}
