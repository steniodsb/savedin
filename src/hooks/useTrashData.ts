import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type DeletedItemType = 'task' | 'habit' | 'goal' | 'project' | 'routine' | 'reminder';

export interface DeletedItem {
  id: string;
  type: DeletedItemType;
  title: string;
  deleted_at: string;
  time_remaining: string;
  hours_remaining: number;
}

export function useTrashData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ['trash', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const result = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
        supabase
          .from('habits')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
        supabase
          .from('goals')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
        supabase
          .from('projects')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
        supabase
          .from('routines')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
        supabase
          .from('reminders')
          .select('id, title, deleted_at')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null),
      ]);

      const [tasks, habits, goals, projects, routines, remindersData] = result;

      type RawItem = { id: string; title: string; deleted_at: string };
      
      const allItems: (RawItem & { type: DeletedItemType })[] = [
        ...(tasks.data || []).map(t => ({ ...t, type: 'task' as const })),
        ...(habits.data || []).map(h => ({ ...h, type: 'habit' as const })),
        ...(goals.data || []).map(g => ({ ...g, type: 'goal' as const })),
        ...(projects.data || []).map(p => ({ ...p, type: 'project' as const })),
        ...(routines.data || []).map(r => ({ ...r, type: 'routine' as const })),
        ...(remindersData.data || []).map(r => ({ ...r, type: 'reminder' as const })),
      ];

      // Calculate time remaining
      const now = new Date();
      const itemsWithTime = allItems.map(item => {
        const deletedAt = new Date(item.deleted_at);
        const hoursRemaining = Math.max(0, 24 - Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60)));
        
        return {
          ...item,
          hours_remaining: hoursRemaining,
          time_remaining: hoursRemaining > 0 ? `${hoursRemaining}h restantes` : 'Expirando em breve'
        };
      });

      // Sort by deletion time (most recent first)
      return itemsWithTime.sort((a, b) => 
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  const restoreItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: DeletedItemType }) => {
      if (!user) throw new Error('User not authenticated');

      const tableName = type === 'routine' ? 'routines' : type === 'reminder' ? 'reminders' : `${type}s`;
      
      const { error } = await supabase
        .from(tableName as any)
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: [type === 'routine' ? 'routines' : `${type}s`] });
      toast.success('Item restaurado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao restaurar: ' + error.message);
    },
  });

  const permanentlyDelete = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: DeletedItemType }) => {
      if (!user) throw new Error('User not authenticated');

      const tableName = type === 'routine' ? 'routines' : type === 'reminder' ? 'reminders' : `${type}s`;
      
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Item excluído permanentemente');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const emptyTrash = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      await Promise.all([
        supabase.from('tasks').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('habits').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('goals').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('projects').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('routines').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
        supabase.from('reminders').delete().eq('user_id', user.id).not('deleted_at', 'is', null),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Lixeira esvaziada');
    },
    onError: (error) => {
      toast.error('Erro ao esvaziar lixeira: ' + error.message);
    },
  });

  return {
    deletedItems,
    isLoading,
    restoreItem: restoreItem.mutateAsync,
    permanentlyDelete: permanentlyDelete.mutateAsync,
    emptyTrash: emptyTrash.mutateAsync,
  };
}
