import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type CategoryType = 'goal' | 'task' | 'habit' | 'project';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
}

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const transformRow = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  type: row.type as CategoryType,
  isSystem: row.is_system,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
});

export function useCategoriesData(type?: CategoryType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = type ? ['categories', user?.id, type] : ['categories', user?.id];

  const { data: categories = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as CategoryRow[]).map(transformRow);
    },
    enabled: !!user,
  });

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string; type: CategoryType }) => {
      if (!user) throw new Error('User not authenticated');

      const maxOrder = categories.length > 0 
        ? Math.max(...categories.filter(c => c.type === data.type).map(c => c.sortOrder)) 
        : -1;

      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          type: data.type,
          name: data.name,
          icon: data.icon,
          color: data.color,
          sort_order: maxOrder + 1,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return transformRow(newCategory as CategoryRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ name: string; icon: string; color: string }> }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async ({ id, moveToId }: { id: string; moveToId: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      const category = categories.find(c => c.id === id);
      if (!category) throw new Error('Category not found');

      // Move items to another category or set to null
      const tableName = `${category.type}s` as 'goals' | 'tasks' | 'habits' | 'projects';
      
      await supabase
        .from(tableName)
        .update({ category_id: moveToId })
        .eq('category_id', id);

      // Soft delete the category
      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Categoria excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  const reorderCategories = useMutation({
    mutationFn: async (reorderedCategories: Category[]) => {
      if (!user) throw new Error('User not authenticated');

      for (let i = 0; i < reorderedCategories.length; i++) {
        await supabase
          .from('categories')
          .update({ sort_order: i })
          .eq('id', reorderedCategories[i].id)
          .eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });

  const getItemCountForCategory = async (categoryId: string, categoryType: CategoryType): Promise<number> => {
    const tableName = `${categoryType}s` as 'goals' | 'tasks' | 'habits' | 'projects';
    
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (error) return 0;
    return count || 0;
  };

  const initializeDefaultCategories = async () => {
    if (!user) return;

    try {
      await supabase.rpc('create_default_categories', {
        user_id_param: user.id
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  return {
    categories,
    isLoading,
    createCategory: createCategory.mutateAsync,
    updateCategory: updateCategory.mutateAsync,
    deleteCategory: deleteCategory.mutateAsync,
    reorderCategories: reorderCategories.mutateAsync,
    getItemCountForCategory,
    initializeDefaultCategories,
  };
}
