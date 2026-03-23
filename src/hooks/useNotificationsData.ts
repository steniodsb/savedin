import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useStore } from '@/store/useStore';
import { format, isToday, isTomorrow } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';
import type { Task, Habit } from '@/types';

export interface Notification {
  id: string;
  user_id: string;
  type: 'habit' | 'task' | 'goal' | 'reminder' | 'system' | 'friend_request' | 'share_invite';
  title: string;
  message: string | null;
  read: boolean;
  data: Json;
  created_at: string;
}

export interface LocalNotification {
  id: string;
  type: 'overdue' | 'today' | 'tomorrow' | 'habit';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data: {
    taskId?: string;
    habitId?: string;
    dueDate?: string;
    icon?: string;
  };
}

export type UnifiedNotification = 
  | { source: 'database'; notification: Notification }
  | { source: 'local'; notification: LocalNotification };

const STORAGE_KEY = 'savedin_viewed_notifications';

export function useNotificationsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tasks, habits, getHabitCompletionForDate } = useStore();
  
  // Local state for viewed notification IDs
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [isViewedLoaded, setIsViewedLoaded] = useState(false);

  // Load viewed IDs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setViewedIds(new Set(parsed));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsViewedLoaded(true);
  }, []);

  // Persist viewed IDs to localStorage
  useEffect(() => {
    if (!isViewedLoaded) return;
    if (viewedIds.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...viewedIds]));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [viewedIds, isViewedLoaded]);

  // Database notifications query
  const { data: dbNotifications = [], isLoading: dbLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Calculate local notifications from tasks and habits
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDayOfWeek = new Date().getDay();

  // Overdue tasks - due date before today
  const overdueTasks = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() < todayStart.getTime();
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  // Tasks due today
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      return isToday(new Date(t.dueDate));
    });
  }, [tasks]);

  // Tasks due tomorrow
  const tomorrowTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      return isTomorrow(new Date(t.dueDate));
    });
  }, [tasks]);

  // Pending habits for today
  const pendingHabits = useMemo(() => {
    return habits.filter((h) => {
      if (!h.isActive) return false;
      const isScheduledToday = 
        h.frequency === 'daily' ||
        (h.frequency === 'weekly' && h.daysOfWeek?.includes(todayDayOfWeek)) ||
        (h.frequency === 'specific_days' && h.daysOfWeek?.includes(todayDayOfWeek));
      
      if (!isScheduledToday) return false;
      
      const count = getHabitCompletionForDate(h.id, todayStr);
      return count < (h.timesPerDay || 1);
    });
  }, [habits, todayDayOfWeek, todayStr, getHabitCompletionForDate]);

  // Build local notifications
  const localNotifications = useMemo((): LocalNotification[] => {
    const notifications: LocalNotification[] = [];
    
    // Overdue tasks
    overdueTasks.forEach((task) => {
      notifications.push({
        id: `overdue-${task.id}`,
        type: 'overdue',
        title: task.title,
        message: `Venceu ${formatOverdueDays(task.dueDate!)}`,
        read: viewedIds.has(`overdue-${task.id}`),
        createdAt: task.dueDate!,
        data: { taskId: task.id, dueDate: task.dueDate, icon: task.icon || '⚠️' },
      });
    });

    // Today tasks
    todayTasks.forEach((task) => {
      notifications.push({
        id: `today-${task.id}`,
        type: 'today',
        title: task.title,
        message: 'Vence hoje',
        read: viewedIds.has(`today-${task.id}`),
        createdAt: task.dueDate!,
        data: { taskId: task.id, dueDate: task.dueDate, icon: task.icon || '📋' },
      });
    });

    // Pending habits
    pendingHabits.forEach((habit) => {
      const count = getHabitCompletionForDate(habit.id, todayStr);
      notifications.push({
        id: `habit-${habit.id}`,
        type: 'habit',
        title: habit.title,
        message: habit.timesPerDay && habit.timesPerDay > 1 
          ? `${count}/${habit.timesPerDay} completados`
          : 'Aguardando conclusão',
        read: viewedIds.has(`habit-${habit.id}`),
        createdAt: new Date().toISOString(),
        data: { habitId: habit.id, icon: habit.icon || '✅' },
      });
    });

    // Tomorrow tasks
    tomorrowTasks.forEach((task) => {
      notifications.push({
        id: `tomorrow-${task.id}`,
        type: 'tomorrow',
        title: task.title,
        message: 'Vence amanhã',
        read: viewedIds.has(`tomorrow-${task.id}`),
        createdAt: task.dueDate!,
        data: { taskId: task.id, dueDate: task.dueDate, icon: task.icon || '📅' },
      });
    });

    return notifications;
  }, [overdueTasks, todayTasks, tomorrowTasks, pendingHabits, viewedIds, getHabitCompletionForDate, todayStr]);

  // All notification IDs for cleanup
  const allLocalIds = useMemo(() => {
    return localNotifications.map(n => n.id);
  }, [localNotifications]);

  // Clean up stale viewed IDs
  useEffect(() => {
    if (!isViewedLoaded || allLocalIds.length === 0) return;
    
    // Only cleanup when we have actual data
    if (tasks.length > 0 || habits.length > 0) {
      const validIds = new Set(allLocalIds);
      const currentIds = [...viewedIds];
      const stillValidIds = currentIds.filter(id => validIds.has(id));
      
      if (stillValidIds.length !== currentIds.length) {
        setViewedIds(new Set(stillValidIds));
      }
    }
  }, [allLocalIds, isViewedLoaded, tasks.length, habits.length, viewedIds]);

  // Count unread notifications
  const unreadLocalCount = useMemo(() => {
    if (!isViewedLoaded) return 0;
    return localNotifications.filter(n => !n.read).length;
  }, [localNotifications, isViewedLoaded]);

  const unreadDbCount = dbNotifications.filter(n => !n.read).length;
  const unreadCount = unreadLocalCount + unreadDbCount;

  // Mark local notification as read
  const markLocalAsRead = useCallback((notificationId: string) => {
    setViewedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      return newSet;
    });
  }, []);

  // Mark all local notifications as read
  const markAllLocalAsRead = useCallback(() => {
    setViewedIds(prev => {
      const newSet = new Set(prev);
      allLocalIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [allLocalIds]);

  // DB mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      
      queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old = []) =>
        old.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', user?.id], context.previous);
      }
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      
      queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old = []) =>
        old.map(n => ({ ...n, read: true }))
      );
      
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', user?.id], context.previous);
      }
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
      
      queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old = []) =>
        old.filter(n => n.id !== notificationId)
      );
      
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', user?.id], context.previous);
      }
    },
  });

  const createNotification = useMutation({
    mutationFn: async (notification: { type: string; title: string; message?: string | null; data?: Json }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          read: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all (both local and DB)
  const markAllAsRead = useCallback(() => {
    markAllLocalAsRead();
    markAllAsReadMutation.mutate();
  }, [markAllLocalAsRead, markAllAsReadMutation]);

  return {
    // Database notifications
    dbNotifications,
    // Local calculated notifications
    localNotifications,
    overdueTasks,
    todayTasks,
    tomorrowTasks,
    pendingHabits,
    // Counts
    unreadCount,
    unreadLocalCount,
    unreadDbCount,
    // Loading states
    isLoading: dbLoading,
    isViewedLoaded,
    // Actions for local notifications
    markLocalAsRead,
    markAllLocalAsRead,
    // Actions for DB notifications
    markDbAsRead: markAsReadMutation.mutate,
    markAllDbAsRead: markAllAsReadMutation.mutate,
    deleteDbNotification: deleteNotificationMutation.mutate,
    createNotification: createNotification.mutate,
    // Combined action
    markAllAsRead,
  };
}

// Helper function
function formatOverdueDays(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
}
