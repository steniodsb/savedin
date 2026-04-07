import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Account } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useAccountsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['savedin-accounts', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;
      if (error) { console.warn('savedin.accounts:', error.message); return []; }
      return (data || []) as Account[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const totalBalance = accounts
    .filter(a => a.is_active)
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const addAccount = useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'user_id' | 'created_at'> & { environment_id?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const environmentId = account.environment_id || selectedEnvironmentId || defaultEnvironment?.id || '';
      const { environment_id: _, ...rest } = account;
      const { data, error } = await savedinClient
        .from('accounts')
        .insert({ ...rest, user_id: user.id, environment_id: environmentId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      toast({ title: 'Conta criada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar conta', variant: 'destructive' });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Account> }) => {
      const { data, error } = await savedinClient
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      toast({ title: 'Conta atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar conta', variant: 'destructive' });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-accounts'] });
      toast({ title: 'Conta removida!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover conta', variant: 'destructive' });
    },
  });

  return {
    accounts,
    totalBalance,
    isLoading,
    addAccount: addAccount.mutateAsync,
    updateAccount: updateAccount.mutateAsync,
    deleteAccount: deleteAccount.mutateAsync,
  };
}
