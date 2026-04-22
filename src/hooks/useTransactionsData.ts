import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Transaction } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

// Helper: generate the next date for a recurring transaction
function nextRecurringDate(baseDate: Date, i: number, recurrenceType: string): Date {
  if (recurrenceType === 'monthly') {
    const mAbs = baseDate.getMonth() + i;
    const mYear = baseDate.getFullYear() + Math.floor(mAbs / 12);
    const mMonth = mAbs % 12;
    const mDays = new Date(mYear, mMonth + 1, 0).getDate();
    return new Date(mYear, mMonth, Math.min(baseDate.getDate(), mDays), 12, 0, 0);
  }
  const d = new Date(baseDate);
  if (recurrenceType === 'weekly') d.setDate(d.getDate() + i * 7);
  else if (recurrenceType === 'yearly') d.setFullYear(d.getFullYear() + i);
  else d.setDate(d.getDate() + i); // daily
  return d;
}

export function useTransactionsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: dbTransactions = [], isLoading } = useQuery({
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

  // Expand recurring and installment transactions with virtual future occurrences.
  // Ensures all occurrences appear in future months even if Supabase doesn't return
  // future-dated rows (PostgREST row limit or RLS cache).
  const transactions = useMemo(() => {
    // --- Recurring ---
    const recurringGroups = new Map<string, { base: Transaction; dates: Set<string> }>();
    for (const t of dbTransactions) {
      if (!t.is_recurring || !t.recurrence_group_id || !t.recurrence_type) continue;
      const entry = recurringGroups.get(t.recurrence_group_id);
      if (!entry) {
        recurringGroups.set(t.recurrence_group_id, { base: t, dates: new Set([t.date]) });
      } else {
        entry.dates.add(t.date);
        if (t.date < entry.base.date) entry.base = t;
      }
    }

    const virtual: Transaction[] = [];
    for (const [groupId, { base, dates }] of recurringGroups) {
      const baseDate = new Date(base.date + 'T12:00:00');
      const count = base.recurrence_type === 'daily' ? 90
        : base.recurrence_type === 'weekly' ? 104
        : base.recurrence_type === 'monthly' ? 60
        : base.recurrence_type === 'yearly' ? 10
        : 60;

      for (let i = 1; i < count; i++) {
        const d = nextRecurringDate(baseDate, i, base.recurrence_type!);
        const dateStr = d.toISOString().split('T')[0];
        if (!dates.has(dateStr)) {
          virtual.push({
            ...base,
            id: `virtual|${groupId}|${dateStr}`,
            date: dateStr,
            status: 'pending',
            paid_at: null,
          } as Transaction);
        }
      }
    }

    // --- Installments ---
    const instGroups = new Map<string, { base: Transaction; existingNums: Set<number> }>();
    for (const t of dbTransactions) {
      if (!t.installment_total || !t.installment_current || !t.recurrence_group_id) continue;
      const entry = instGroups.get(t.recurrence_group_id);
      if (!entry) {
        instGroups.set(t.recurrence_group_id, { base: t, existingNums: new Set([t.installment_current]) });
      } else {
        entry.existingNums.add(t.installment_current);
        if (t.installment_current < entry.base.installment_current!) entry.base = t;
      }
    }

    for (const [groupId, { base, existingNums }] of instGroups) {
      const baseDate = new Date(base.date + 'T12:00:00');
      for (let i = base.installment_current! + 1; i <= base.installment_total!; i++) {
        if (existingNums.has(i)) continue;
        const monthOffset = i - base.installment_current!;
        const d = nextRecurringDate(baseDate, monthOffset, 'monthly');
        const dateStr = d.toISOString().split('T')[0];
        let description = base.description || '';
        if (!base.card_id && description) {
          description = description.replace(/\(\d+\/\d+\)/, `(${i}/${base.installment_total})`);
        }
        virtual.push({
          ...base,
          id: `virtual|${groupId}|inst|${i}`,
          date: dateStr,
          installment_current: i,
          description,
          status: 'pending',
          paid_at: null,
        } as Transaction);
      }
    }

    return [...dbTransactions, ...virtual];
  }, [dbTransactions]);

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account' | 'credit_card'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const envId = transaction.environment_id || selectedEnvironmentId || defaultEnvironment?.id || null;
      const baseData = { ...transaction, user_id: user.id, environment_id: envId };

      // If recurring transaction, generate occurrences ahead automatically
      if (transaction.is_recurring && transaction.recurrence_type) {
        const groupId = crypto.randomUUID();
        const rows = [];
        const startDate = new Date(transaction.date + 'T12:00:00');
        const startDueDate = transaction.due_date ? new Date(transaction.due_date + 'T12:00:00') : null;

        const count = transaction.recurrence_type === 'daily' ? 90
          : transaction.recurrence_type === 'weekly' ? 104
          : transaction.recurrence_type === 'monthly' ? 60
          : transaction.recurrence_type === 'yearly' ? 10
          : 60;

        for (let i = 0; i < count; i++) {
          const nextDate = nextRecurringDate(startDate, i, transaction.recurrence_type);
          const row: any = {
            ...baseData,
            recurrence_group_id: groupId,
            date: nextDate.toISOString().split('T')[0],
          };

          if (startDueDate) {
            const nextDue = nextRecurringDate(startDueDate, i, transaction.recurrence_type);
            row.due_date = nextDue.toISOString().split('T')[0];
          }

          if (i > 0) {
            row.status = 'pending';
            row.paid_at = null;
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

          if (startDueDate && !transaction.card_id) {
            const dueMabs = startDueDate.getMonth() + monthOffset;
            const dueYear = startDueDate.getFullYear() + Math.floor(dueMabs / 12);
            const dueMonth = dueMabs % 12;
            const dueDays = new Date(dueYear, dueMonth + 1, 0).getDate();
            row.due_date = new Date(dueYear, dueMonth, Math.min(startDueDate.getDate(), dueDays), 12, 0, 0)
              .toISOString().split('T')[0];
          }

          if (monthOffset > 0) {
            row.status = 'pending';
            row.paid_at = null;
          }

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
      if (id.startsWith('virtual|')) return; // virtual occurrences have no DB row
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
      // Virtual occurrence: materialize in DB first, then mark as paid
      if (id.startsWith('virtual|')) {
        const parts = id.split('|');
        const isInstallment = parts[2] === 'inst';
        const groupId = isInstallment ? parts[1] : parts[1];
        const base = dbTransactions.find(t => t.recurrence_group_id === groupId);
        if (!base) throw new Error('Transação base não encontrada');
        const envId = base.environment_id || selectedEnvironmentId || defaultEnvironment?.id || null;

        if (isInstallment) {
          const installmentNum = parseInt(parts[3]);
          const dateStr = transactions.find(t => t.id === id)?.date || '';
          let description = base.description || '';
          if (!base.card_id && description) {
            description = description.replace(/\(\d+\/\d+\)/, `(${installmentNum}/${base.installment_total})`);
          }
          const { data, error } = await savedinClient
            .from('transactions')
            .insert({
              user_id: user?.id,
              environment_id: envId,
              type: base.type,
              amount: base.amount,
              description,
              date: dateStr,
              due_date: dateStr,
              category_id: base.category_id,
              account_id: base.account_id,
              card_id: base.card_id,
              notes: base.notes,
              tags: base.tags,
              installment_current: installmentNum,
              installment_total: base.installment_total,
              recurrence_group_id: groupId,
              status: 'paid',
              paid_at: paidAt,
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        }

        // Recurring virtual
        const dateStr = parts[2];
        const { data, error } = await savedinClient
          .from('transactions')
          .insert({
            user_id: user?.id,
            environment_id: envId,
            type: base.type,
            amount: base.amount,
            description: base.description,
            date: dateStr,
            due_date: dateStr,
            category_id: base.category_id,
            account_id: base.account_id,
            card_id: base.card_id,
            notes: base.notes,
            tags: base.tags,
            is_recurring: true,
            recurrence_type: base.recurrence_type,
            recurrence_group_id: groupId,
            status: 'paid',
            paid_at: paidAt,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }

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
