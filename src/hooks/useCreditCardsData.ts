import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { CreditCard, Invoice } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useCreditCardsData() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: creditCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['savedin-credit-cards', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;
      if (error) { console.warn('savedin.credit_cards:', error.message); return []; }
      return (data || []) as CreditCard[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['savedin-invoices', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = savedinClient
        .from('invoices')
        .select('*')
        .eq('user_id', user.id);
      if (selectedEnvironmentId) {
        query = query.eq('environment_id', selectedEnvironmentId);
      }
      query = query.order('year', { ascending: false }).order('month', { ascending: false });
      const { data, error } = await query;
      if (error) { console.warn('savedin.invoices:', error.message); return []; }
      return (data || []) as Invoice[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const isLoading = cardsLoading || invoicesLoading;

  const totalLimit = creditCards
    .filter(c => c.is_active)
    .reduce((sum, c) => sum + Number(c.credit_limit), 0);

  const addCreditCard = useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'user_id' | 'created_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('credit_cards')
        .insert({ ...card, user_id: user.id, environment_id: selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-credit-cards'] });
      toast({ title: 'Cartão criado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar cartão', variant: 'destructive' });
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreditCard> }) => {
      const { data, error } = await savedinClient
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-credit-cards'] });
      toast({ title: 'Cartão atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar cartão', variant: 'destructive' });
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await savedinClient
        .from('credit_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-credit-cards'] });
      toast({ title: 'Cartão removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover cartão', variant: 'destructive' });
    },
  });

  // Invoice operations
  const getOrCreateInvoice = useMutation({
    mutationFn: async ({ card_id, month, year }: { card_id: string; month: number; year: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Check if invoice exists
      const existing = invoices.find(i => i.card_id === card_id && i.month === month && i.year === year);
      if (existing) return existing;

      const { data, error } = await savedinClient
        .from('invoices')
        .insert({ card_id, month, year, user_id: user.id, status: 'open', total: 0, environment_id: selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-invoices'] });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await savedinClient
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-invoices'] });
    },
  });

  const getInvoiceForCard = (cardId: string, month: number, year: number) => {
    return invoices.find(i => i.card_id === cardId && i.month === month && i.year === year);
  };

  const getCurrentInvoice = (cardId: string) => {
    const now = new Date();
    return getInvoiceForCard(cardId, now.getMonth() + 1, now.getFullYear());
  };

  return {
    creditCards,
    invoices,
    totalLimit,
    isLoading,
    addCreditCard: addCreditCard.mutateAsync,
    updateCreditCard: updateCreditCard.mutateAsync,
    deleteCreditCard: deleteCreditCard.mutateAsync,
    getOrCreateInvoice: getOrCreateInvoice.mutateAsync,
    updateInvoice: updateInvoice.mutateAsync,
    getInvoiceForCard,
    getCurrentInvoice,
  };
}
