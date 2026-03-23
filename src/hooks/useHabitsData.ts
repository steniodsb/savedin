import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Habit, HabitLog, HabitColor, TimeOfDay, HabitFrequency, HabitContributionType } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Database row types
interface HabitRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: HabitColor;
  frequency: HabitFrequency;
  days_of_week: number[] | null;
  interval_days: number | null;
  times_per_day: number;
  time_of_day: TimeOfDay;
  specific_time: string | null;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  goal_type: string | null;
  goal_target: number | null;
  routine_id: string | null;
  order_in_routine: number | null;
  created_at: string;
  is_active: boolean;
  linked_goal_id: string | null;
  category_id: string | null;
  estimated_minutes: number | null;
  total_time_spent: number | null;
  timer_running: boolean | null;
  timer_started_at: string | null;
  // Tracking type fields
  tracking_type: string | null;
  target_value: number | null;
  unit: string | null;
  custom_unit: string | null;
  checklist_items: string[] | null;
  require_all_items: boolean | null;
  contribution_type: string | null;
  contribution_value: number | null;
}

interface HabitLogRow {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed_at: string;
  count: number;
  notes: string | null;
  mood: number | null;
}

// Transform functions
const transformHabitRow = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  icon: row.icon,
  color: row.color,
  frequency: row.frequency,
  daysOfWeek: row.days_of_week || undefined,
  intervalDays: row.interval_days || undefined,
  timesPerDay: row.times_per_day,
  timeOfDay: row.time_of_day,
  specificTime: row.specific_time || undefined,
  currentStreak: row.current_streak,
  longestStreak: row.longest_streak,
  totalCompletions: row.total_completions,
  goalType: row.goal_type as 'streak' | 'total' | 'weekly' | undefined,
  goalTarget: row.goal_target || undefined,
  routineId: row.routine_id || undefined,
  orderInRoutine: row.order_in_routine || undefined,
  createdAt: row.created_at,
  isActive: row.is_active,
  linkedGoalId: row.linked_goal_id || undefined,
  categoryId: row.category_id || undefined,
  estimatedMinutes: row.estimated_minutes || undefined,
  totalTimeSpent: row.total_time_spent || undefined,
  timerRunning: row.timer_running || undefined,
  timerStartedAt: row.timer_started_at || undefined,
  // Tracking type fields
  trackingType: (row.tracking_type as 'simple' | 'quantitative' | 'checklist') || 'simple',
  targetValue: row.target_value || undefined,
  unit: row.unit || undefined,
  customUnit: row.custom_unit || undefined,
  checklistItems: row.checklist_items || undefined,
  requireAllItems: row.require_all_items || undefined,
  // Contribution fields
  contributionType: (row.contribution_type as HabitContributionType) || 'none',
  contributionValue: row.contribution_value || undefined,
});

const transformHabitLogRow = (row: HabitLogRow): HabitLog => ({
  id: row.id,
  habitId: row.habit_id,
  date: row.date,
  completedAt: row.completed_at,
  count: row.count,
  notes: row.notes || undefined,
  mood: row.mood as 1 | 2 | 3 | 4 | 5 | undefined,
});

export function useHabitsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as HabitRow[]).map(transformHabitRow);
    },
    enabled: !!user,
  });

  const { data: habitLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['habitLogs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return (data as HabitLogRow[]).map(transformHabitLogRow);
    },
    enabled: !!user,
  });

  const addHabit = useMutation({
    mutationFn: async (habit: Habit) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('habits').insert({
        user_id: user.id,
        title: habit.title,
        description: habit.description || null,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        days_of_week: habit.daysOfWeek || null,
        interval_days: habit.intervalDays || null,
        times_per_day: habit.timesPerDay,
        time_of_day: habit.timeOfDay,
        specific_time: habit.specificTime || null,
        current_streak: habit.currentStreak || 0,
        longest_streak: habit.longestStreak || 0,
        total_completions: habit.totalCompletions || 0,
        goal_type: habit.goalType || null,
        goal_target: habit.goalTarget || null,
        routine_id: habit.routineId || null,
        order_in_routine: habit.orderInRoutine || null,
        is_active: habit.isActive,
        linked_goal_id: habit.linkedGoalId || null,
        contribution_type: habit.contributionType || 'none',
        contribution_value: habit.contributionValue || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar hábito: ' + error.message);
    },
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.daysOfWeek !== undefined) updateData.days_of_week = updates.daysOfWeek;
      if (updates.intervalDays !== undefined) updateData.interval_days = updates.intervalDays;
      if (updates.timesPerDay !== undefined) updateData.times_per_day = updates.timesPerDay;
      if (updates.timeOfDay !== undefined) updateData.time_of_day = updates.timeOfDay;
      if (updates.specificTime !== undefined) updateData.specific_time = updates.specificTime;
      if (updates.currentStreak !== undefined) updateData.current_streak = updates.currentStreak;
      if (updates.longestStreak !== undefined) updateData.longest_streak = updates.longestStreak;
      if (updates.totalCompletions !== undefined) updateData.total_completions = updates.totalCompletions;
      if (updates.goalType !== undefined) updateData.goal_type = updates.goalType;
      if (updates.goalTarget !== undefined) updateData.goal_target = updates.goalTarget;
      if (updates.routineId !== undefined) updateData.routine_id = updates.routineId;
      if (updates.orderInRoutine !== undefined) updateData.order_in_routine = updates.orderInRoutine;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.linkedGoalId !== undefined) updateData.linked_goal_id = updates.linkedGoalId;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      if (updates.contributionType !== undefined) updateData.contribution_type = updates.contributionType;
      if (updates.contributionValue !== undefined) updateData.contribution_value = updates.contributionValue;
      const { error } = await supabase
        .from('habits')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar hábito: ' + error.message);
    },
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Soft delete - move to trash
      const { error } = await supabase
        .from('habits')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Hábito movido para lixeira', {
        description: 'Será excluído em 24h',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase.from('habits').update({ deleted_at: null }).eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast.success('Ação desfeita');
          }
        },
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Erro ao excluir hábito: ' + error.message);
    },
  });

  const addHabitLog = useMutation({
    mutationFn: async (log: HabitLog) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('habit_logs').insert({
        user_id: user.id,
        habit_id: log.habitId,
        date: log.date,
        completed_at: log.completedAt,
        count: log.count,
        notes: log.notes || null,
        mood: log.mood || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all habit logs queries to sync across views (TodayView, HabitsView)
      queryClient.invalidateQueries({ queryKey: ['habitLogs'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['habits'], refetchType: 'all' });
    },
    onError: (error) => {
      toast.error('Erro ao registrar hábito: ' + error.message);
    },
  });

  const updateHabitLog = useMutation({
    mutationFn: async ({ habitId, date, count }: { habitId: string; date: string; count: number }) => {
      if (!user) throw new Error('User not authenticated');

      if (count <= 0) {
        // Delete the log if count is 0 or less
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('date', date)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Update the count
        const { error } = await supabase
          .from('habit_logs')
          .update({ count })
          .eq('habit_id', habitId)
          .eq('date', date)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all habit logs queries to sync across views (TodayView, HabitsView)
      queryClient.invalidateQueries({ queryKey: ['habitLogs'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['habits'], refetchType: 'all' });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar registro: ' + error.message);
    },
  });

  return {
    habits,
    habitLogs,
    isLoading: habitsLoading || logsLoading,
    addHabit: addHabit.mutateAsync,
    updateHabit: updateHabit.mutateAsync,
    deleteHabit: deleteHabit.mutateAsync,
    addHabitLog: addHabitLog.mutateAsync,
    updateHabitLog: updateHabitLog.mutateAsync,
  };
}
