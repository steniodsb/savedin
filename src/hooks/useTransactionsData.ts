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
      const recurring = (data || []).filter((t: any) => t.is_recurring);
      console.log('[query] total:', data?.length, '| recurring:', recurring.length, '| dates:', recurring.map((t: any) => t.date).slice(0, 10));
      return (data || []) as Transaction[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account' | 'credit_card'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const envId = transaction.environment_id || selectedEnvironmentId || defaultEnvironment?.id || '';
      const baseData = { ...transaction, user_id: user.id, environment_id: envId };

      // If recurring transaction, generate occurrences ahead automatically
      if (transaction.is_recurring && transaction.recurrence_type) {
        const groupId = crypto.randomUUID();
        const rows = [];
        const startDate = new Date(transaction.date + 'T12:00:00');
        const startDueDate = transaction.due_date ? new Date(transaction.due_date + 'T12:00:00') : null;

        // Generate based on recurrence type
        const count = transaction.recurrence_type === 'daily' ? 90
          : transaction.recurrence_type === 'weekly' ? 104
          : transaction.recurrence_type === 'monthly' ? 60
          : transaction.recurrence_type === 'yearly' ? 10
          : 60;

        for (let i = 0; i < count; i++) {
          const nextDate = new Date(startDate);
          const nextDueDate = startDueDate ? new Date(startDueDate) : null;

          if (transaction.recurrence_type === 'daily') {
            nextDate.setDate(nextDate.getDate() + i);
            nextDueDate?.setDate(nextDueDate.getDate() + i);
          } else if (transaction.recurrence_type === 'weekly') {
            nextDate.setDate(nextDate.getDate() + i * 7);
            nextDueDate?.setDate(nextDueDate.getDate() + i * 7);
          } else if (transaction.recurrence_type === 'monthly') {
            const mAbs = startDate.getMonth() + i;
            const mYear = startDate.getFullYear() + Math.floor(mAbs / 12);
            const mMonth = mAbs % 12;
            const mDays = new Date(mYear, mMonth + 1, 0).getDate();
            nextDate.setFullYear(mYear, mMonth, Math.min(startDate.getDate(), mDays));
            if (startDueDate && nextDueDate) {
              const dAbs = startDueDate.getMonth() + i;
              const dYear = startDueDate.getFullYear() + Math.floor(dAbs / 12);
              const dMonth = dAbs % 12;
              const dDays = new Date(dYear, dMonth + 1, 0).getDate();
              nextDueDate.setFullYear(dYear, dMonth, Math.min(startDueDate.getDate(), dDays));
            }
          } else if (transaction.recurrence_type === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + i);
            nextDueDate?.setFullYear(nextDueDate.getFullYear() + i);
          }

          const row: any = {
            ...baseData,
            recurrence_group_id: groupId,
            date: nextDate.toISOString().split('T')[0],
          };

          if (nextDueDate) {
            row.due_date = nextDueDate.toISOString().split('T')[0];
          }

          // Only first occurrence keeps the original status; future ones are pending
          if (i > 0) {
            row.status = 'pending';
            row.paid_at = null;
          }

          rows.push(row);
        }

        console.log('[recurring] inserting', rows.length, 'rows, first:', rows[0]?.date, 'last:', rows[rows.length - 1]?.date);
        const { data, error } = await savedinClient
          .from('transactions')
          .insert(rows)
          .select();
        if (error) throw error;
        console.log('[recurring] inserted OK, returned', data?.length, 'rows');
        return data?.[0];
      }

      // If installment transaction, generate all remaining parcels automatically
      if (transaction.installment_total && transaction.installment_current) {
        const groupId = crypto.randomUUID();
        const rows = [];
        const startDate = new Date(transaction.date + 'T12:00:00');
        const startDueDate = transaction.due_date ? new Date(transaction.due_date + 'T12:00:00') : null;

        for (let i = transaction.installment_current; i <= transaction.installment_total; i++) {
          const monthOffset = i - transaction.installment_current;

          const targetMonthAbs = startDate.getMonth() + monthOffset;
          const targetYear = startDate.getFullYear() + Math.floor(targetMonthAbs / 12);
          const targetMonth = targetMonthAbs % 12;
          const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
          const parcelDate = new Date(targetYear, targetMonth, Math.min(startDate.getDate(), daysInMonth), 12, 0, 0);

          const row: any = {
            ...baseData,
            installment_current: i,
            recurrence_group_id: groupId,
            date: parcelDate.toISOString().split('T')[0],
          };

          // For non-card transactions with due_date, also offset the due_date
          if (startDueDate && !transaction.card_id) {
            const dueMabs = startDueDate.getMonth() + monthOffset;
            const dueYear = startDueDate.getFullYear() + Math.floor(dueMabs / 12);
            const dueMonth = dueMabs % 12;
            const dueDays = new Date(dueYear, dueMonth + 1, 0).getDate();
            const parcelDueDate = new Date(dueYear, dueMonth, Math.min(startDueDate.getDate(), dueDays), 12, 0, 0);
            row.due_date = parcelDueDate.toISOString().split('T')[0];
          }

          // Only the first parcel keeps the original status; future ones are pending
          if (monthOffset > 0) {
            row.status = 'pending';
            row.paid_at = null;
          }

          // Update description with parcel number for non-card
          if (!transaction.card_id && transaction.description) {
            row.description = transaction.description.replace(/\(\d+\/\d+\)/, `(${i}/${transaction.installment_total})`);
          }

          rows.push(row);
        }

        const { data, error } = await savedinClient
          .from('transactions')
          .insert(rows)
          .select();
        if (error) throw error;
        return data?.[0];
      }

      const { data, error } = await savedinClient
        .from('transactions')
        .insert(baseData)
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
      const d = new Date(t.date + 'T12:00:00');
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
