import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'custom';
export type ReminderType = 'standalone' | 'task' | 'habit' | 'goal';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: ReminderType;
  linkedItemId?: string;
  frequency: ReminderFrequency;
  customDays?: number[];
  timeOfDay: string;
  startDate: string;
  endDate?: string;
  totalDays?: number;
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletedAt?: string;
  createdAt: string;
}

interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  type: string;
  linked_item_id: string | null;
  frequency: string;
  custom_days: number[] | null;
  time_of_day: string;
  start_date: string;
  end_date: string | null;
  total_days: number | null;
  is_active: boolean;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_completed_at: string | null;
  created_at: string;
}

const transformRow = (row: ReminderRow): Reminder => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  icon: row.icon,
  type: row.type as ReminderType,
  linkedItemId: row.linked_item_id || undefined,
  frequency: row.frequency as ReminderFrequency,
  customDays: row.custom_days || undefined,
  timeOfDay: row.time_of_day,
  startDate: row.start_date,
  endDate: row.end_date || undefined,
  totalDays: row.total_days || undefined,
  isActive: row.is_active,
  currentStreak: row.current_streak,
  longestStreak: row.longest_streak,
  totalCompletions: row.total_completions,
  lastCompletedAt: row.last_completed_at || undefined,
  createdAt: row.created_at,
});

export function useRemindersData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('time_of_day', { ascending: true });

      if (error) throw error;
      return (data as ReminderRow[]).map(transformRow);
    },
    enabled: !!user,
  });

  const addReminder = useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions' | 'lastCompletedAt'>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: reminder.title,
          description: reminder.description || null,
          icon: reminder.icon,
          type: reminder.type,
          linked_item_id: reminder.linkedItemId || null,
          frequency: reminder.frequency,
          custom_days: reminder.customDays || null,
          time_of_day: reminder.timeOfDay,
          start_date: reminder.startDate,
          end_date: reminder.endDate || null,
          total_days: reminder.totalDays || null,
          is_active: reminder.isActive,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lembrete: ' + error.message);
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reminder> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.customDays !== undefined) updateData.custom_days = updates.customDays;
      if (updates.timeOfDay !== undefined) updateData.time_of_day = updates.timeOfDay;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.totalDays !== undefined) updateData.total_days = updates.totalDays;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.currentStreak !== undefined) updateData.current_streak = updates.currentStreak;
      if (updates.longestStreak !== undefined) updateData.longest_streak = updates.longestStreak;
      if (updates.totalCompletions !== undefined) updateData.total_completions = updates.totalCompletions;
      if (updates.lastCompletedAt !== undefined) updateData.last_completed_at = updates.lastCompletedAt;

      const { error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lembrete: ' + error.message);
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Soft delete
      const { error } = await supabase
        .from('reminders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Lembrete movido para lixeira', {
        description: 'Será excluído em 24h',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase.from('reminders').update({ deleted_at: null }).eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast.success('Ação desfeita');
          }
        },
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Erro ao excluir lembrete: ' + error.message);
    },
  });

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Register completion
      const { error: completionError } = await supabase
        .from('reminder_completions')
        .insert({
          reminder_id: id,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        } as any);

      if (completionError) throw completionError;

      // Get current reminder data
      const reminder = reminders.find(r => r.id === id);
      if (reminder) {
        const newStreak = reminder.currentStreak + 1;
        
        // Update streak and counters
        const { error: updateError } = await supabase
          .from('reminders')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, reminder.longestStreak),
            total_completions: reminder.totalCompletions + 1,
            last_completed_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete concluído! 🎉');
    },
    onError: (error) => {
      toast.error('Erro ao completar lembrete: ' + error.message);
    },
  });

  // Helper to check if reminder can be completed today
  const canCompleteToday = (reminder: Reminder): boolean => {
    if (!reminder.lastCompletedAt) return true;
    const lastCompleted = new Date(reminder.lastCompletedAt);
    const today = new Date();
    return lastCompleted.toDateString() !== today.toDateString();
  };

  return {
    reminders,
    isLoading,
    addReminder: addReminder.mutateAsync,
    updateReminder: updateReminder.mutateAsync,
    deleteReminder: deleteReminder.mutateAsync,
    completeReminder: completeReminder.mutateAsync,
    canCompleteToday,
  };
}
