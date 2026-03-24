import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from './useEnvironmentsData';
import { Category } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';

export function useSavedinCategories() {
  const { user } = useAuth();
  const { selectedEnvironmentId } = useUIStore();
  const { defaultEnvironment } = useEnvironmentsData();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['savedin-categories', user?.id, selectedEnvironmentId],
    queryFn: async () => {
      if (!user?.id) return [];
      const orFilter = selectedEnvironmentId
        ? `and(user_id.eq.${user.id},environment_id.eq.${selectedEnvironmentId}),is_default.eq.true`
        : `user_id.eq.${user.id},is_default.eq.true`;
      let query = savedinClient
        .from('categories')
        .select('*')
        .or(orFilter);
      query = query.order('is_default', { ascending: false }).order('name', { ascending: true });
      const { data, error } = await query;
      if (error) { console.warn('savedin.categories:', error.message); return []; }
      return (data || []) as Category[];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const expenseCategories = categories.filter(c => c.type === 'expense' && c.is_active);
  const incomeCategories = categories.filter(c => c.type === 'income' && c.is_active);

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'is_default'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await savedinClient
        .from('categories')
        .insert({ ...category, user_id: user.id, is_default: false, environment_id: selectedEnvironmentId || defaultEnvironment?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-categories'] });
      toast({ title: 'Categoria criada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const { data, error } = await savedinClient
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - just deactivate
      const { error } = await savedinClient
        .from('categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-categories'] });
      toast({ title: 'Categoria arquivada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao arquivar categoria', variant: 'destructive' });
    },
  });

  return {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
    addCategory: addCategory.mutateAsync,
    updateCategory: updateCategory.mutateAsync,
    deleteCategory: deleteCategory.mutateAsync,
  };
}
