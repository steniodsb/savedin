import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Routine, TimeOfDay } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RoutineRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  time_of_day: TimeOfDay;
  habit_ids: string[];
  estimated_minutes: number;
  allow_skip: boolean;
  is_active: boolean;
}

const transformRoutineRow = (row: RoutineRow): Routine => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  icon: row.icon,
  timeOfDay: row.time_of_day,
  habitIds: row.habit_ids || [],
  estimatedMinutes: row.estimated_minutes,
  allowSkip: row.allow_skip,
  isActive: row.is_active,
});

export function useRoutinesData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) throw error;
      return (data as RoutineRow[]).map(transformRoutineRow);
    },
    enabled: !!user,
  });

  const addRoutine = useMutation({
    mutationFn: async (routine: Routine) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('routines').insert({
        user_id: user.id,
        title: routine.title,
        description: routine.description || null,
        icon: routine.icon,
        time_of_day: routine.timeOfDay,
        habit_ids: routine.habitIds,
        estimated_minutes: routine.estimatedMinutes,
        allow_skip: routine.allowSkip,
        is_active: routine.isActive,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar rotina: ' + error.message);
    },
  });

  const updateRoutine = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Routine> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.timeOfDay !== undefined) updateData.time_of_day = updates.timeOfDay;
      if (updates.habitIds !== undefined) updateData.habit_ids = updates.habitIds;
      if (updates.estimatedMinutes !== undefined) updateData.estimated_minutes = updates.estimatedMinutes;
      if (updates.allowSkip !== undefined) updateData.allow_skip = updates.allowSkip;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('routines')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar rotina: ' + error.message);
    },
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Soft delete - move to trash
      const { error } = await supabase
        .from('routines')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Rotina movida para lixeira', {
        description: 'Será excluída em 24h',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase.from('routines').update({ deleted_at: null }).eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['routines'] });
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast.success('Ação desfeita');
          }
        },
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Erro ao excluir rotina: ' + error.message);
    },
  });

  return {
    routines,
    isLoading,
    addRoutine: addRoutine.mutateAsync,
    updateRoutine: updateRoutine.mutateAsync,
    deleteRoutine: deleteRoutine.mutateAsync,
  };
}
