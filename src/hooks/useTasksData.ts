import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskLevel } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Database row type (snake_case)
interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  level: TaskLevel;
  level_label: string;
  due_date: string | null;
  start_date: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  total_time_spent: number | null;
  timer_running: boolean | null;
  timer_started_at: string | null;
  parent_id: string | null;
  project_id: string | null;
  category_id: string | null;
  depth: number;
  dependencies: string[];
  dependents: string[];
  blocked_by: string[];
  children_ids: string[];
  children_count: number;
  completed_children_count: number;
  created_at: string;
  completed_at: string | null;
  scheduled_for: string | null;
  notes: string | null;
  tags: string[] | null;
  linked_goal_id: string | null;
  is_archived: boolean;
  assignees: string[] | null;
  last_updated_by: string | null;
  last_updated_at: string | null;
}

// Extended task with sharing info
export interface TaskWithSharing extends Task {
  isSharedWithMe?: boolean;
  ownerUsername?: string;
  ownerName?: string;
  sharedByUserId?: string;
}

// Transform database row to app format
const transformRow = (row: TaskRow, sharingInfo?: { isSharedWithMe: boolean; ownerUsername?: string; ownerName?: string; sharedByUserId?: string }): TaskWithSharing => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  icon: row.icon || undefined,
  color: row.color || undefined,
  status: row.status,
  priority: row.priority,
  level: row.level,
  levelLabel: row.level_label,
  dueDate: row.due_date || undefined,
  startDate: row.start_date || undefined,
  estimatedMinutes: row.estimated_minutes || undefined,
  actualMinutes: row.actual_minutes || undefined,
  totalTimeSpent: row.total_time_spent || undefined,
  timerRunning: row.timer_running || undefined,
  timerStartedAt: row.timer_started_at || undefined,
  parentId: row.parent_id,
  projectId: row.project_id || undefined,
  categoryId: row.category_id || undefined,
  depth: row.depth,
  dependencies: row.dependencies || [],
  dependents: row.dependents || [],
  blockedBy: row.blocked_by || [],
  childrenIds: row.children_ids || [],
  childrenCount: row.children_count,
  completedChildrenCount: row.completed_children_count,
  createdAt: row.created_at,
  completedAt: row.completed_at || undefined,
  scheduledFor: row.scheduled_for || undefined,
  notes: row.notes || undefined,
  tags: row.tags || undefined,
  linkedGoalId: row.linked_goal_id || undefined,
  isArchived: row.is_archived,
  assignees: row.assignees || undefined,
  // Sharing info
  isSharedWithMe: sharingInfo?.isSharedWithMe,
  ownerUsername: sharingInfo?.ownerUsername,
  ownerName: sharingInfo?.ownerName,
  sharedByUserId: sharingInfo?.sharedByUserId,
});

// Transform app format to database insert
const transformToInsert = (task: Partial<Task>, userId: string): Partial<TaskRow> => ({
  user_id: userId,
  title: task.title,
  description: task.description || null,
  icon: task.icon || null,
  color: (task as any).color || null,
  status: task.status || 'pending',
  priority: task.priority || 'medium',
  level: task.level || 'task',
  level_label: task.levelLabel || 'Tarefa',
  due_date: task.dueDate || null,
  start_date: task.startDate || null,
  estimated_minutes: task.estimatedMinutes || null,
  actual_minutes: task.actualMinutes || null,
  parent_id: task.parentId || null,
  project_id: task.projectId || null,
  category_id: task.categoryId || null,
  depth: task.depth || 0,
  dependencies: task.dependencies || [],
  dependents: task.dependents || [],
  blocked_by: task.blockedBy || [],
  children_ids: task.childrenIds || [],
  children_count: task.childrenCount || 0,
  completed_children_count: task.completedChildrenCount || 0,
  scheduled_for: task.scheduledFor || null,
  notes: task.notes || null,
  tags: task.tags || null,
  linked_goal_id: task.linkedGoalId || null,
  is_archived: task.isArchived || false,
  assignees: task.assignees || null,
});

export function useTasksData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // 1. Buscar tarefas compartilhadas com o usuário
      const { data: sharedItems } = await supabase
        .from('shared_items')
        .select('item_id, owner_id')
        .eq('shared_with_id', user.id)
        .eq('item_type', 'task')
        .eq('status', 'accepted');
      
      const sharedTaskIds = (sharedItems || []).map(s => s.item_id);
      const ownerMap = new Map((sharedItems || []).map(s => [s.item_id, s.owner_id]));
      
      // 2. Buscar perfis dos owners (para mostrar "Compartilhada por @username")
      const ownerIds = [...new Set((sharedItems || []).map(s => s.owner_id))];
      let ownerProfiles = new Map<string, { username: string; full_name: string | null }>();
      
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name')
          .in('user_id', ownerIds);
        
        ownerProfiles = new Map((profiles || []).map(p => [p.user_id, { username: p.username, full_name: p.full_name }]));
      }
      
      // 3. Buscar tarefas próprias
      const { data: ownTasks, error: ownError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (ownError) throw ownError;
      
      // 4. Buscar tarefas compartilhadas (se houver)
      let sharedTasks: TaskRow[] = [];
      if (sharedTaskIds.length > 0) {
        const { data: shared, error: sharedError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', sharedTaskIds)
          .is('deleted_at', null);
        
        if (sharedError) throw sharedError;
        sharedTasks = (shared || []) as TaskRow[];
      }
      
      // 5. Combinar e transformar
      const ownTransformed = (ownTasks as TaskRow[]).map(row => transformRow(row, { isSharedWithMe: false }));
      
      const sharedTransformed = sharedTasks.map(row => {
        const ownerId = ownerMap.get(row.id);
        const ownerProfile = ownerId ? ownerProfiles.get(ownerId) : undefined;
        return transformRow(row, {
          isSharedWithMe: true,
          ownerUsername: ownerProfile?.username,
          ownerName: ownerProfile?.full_name || undefined,
          sharedByUserId: ownerId,
        });
      });
      
      // Evitar duplicatas (caso a tarefa seja própria E compartilhada)
      const allTasks = [...ownTransformed];
      sharedTransformed.forEach(task => {
        if (!allTasks.find(t => t.id === task.id)) {
          allTasks.push(task);
        }
      });
      
      return allTasks;
    },
    enabled: !!user,
  });

  const addTask = useMutation({
    mutationFn: async (task: Task) => {
      if (!user) throw new Error('User not authenticated');

      const insertData = transformToInsert(task, user.id);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return transformRow(data as TaskRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        last_updated_by: user.id,
        last_updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.level !== undefined) updateData.level = updates.level;
      if (updates.levelLabel !== undefined) updateData.level_label = updates.levelLabel;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.estimatedMinutes !== undefined) updateData.estimated_minutes = updates.estimatedMinutes;
      if (updates.actualMinutes !== undefined) updateData.actual_minutes = updates.actualMinutes;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
      if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
      if (updates.depth !== undefined) updateData.depth = updates.depth;
      if (updates.dependencies !== undefined) updateData.dependencies = updates.dependencies;
      if (updates.dependents !== undefined) updateData.dependents = updates.dependents;
      if (updates.blockedBy !== undefined) updateData.blocked_by = updates.blockedBy;
      if (updates.childrenIds !== undefined) updateData.children_ids = updates.childrenIds;
      if (updates.childrenCount !== undefined) updateData.children_count = updates.childrenCount;
      if (updates.completedChildrenCount !== undefined) updateData.completed_children_count = updates.completedChildrenCount;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
      if (updates.scheduledFor !== undefined) updateData.scheduled_for = updates.scheduledFor;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.linkedGoalId !== undefined) updateData.linked_goal_id = updates.linkedGoalId;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
      if (updates.assignees !== undefined) updateData.assignees = updates.assignees;
      if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
      
      // A política RLS controla o acesso - permite owner ou shared_with
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['shared_items'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Soft delete - move to trash
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Tarefa movida para lixeira', {
        description: 'Será excluída em 24h',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase.from('tasks').update({ deleted_at: null }).eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast.success('Ação desfeita');
          }
        },
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Erro ao excluir tarefa: ' + error.message);
    },
  });

  // Realtime subscription para sincronização automática
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // Invalidar a query para refetch automático
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    tasks,
    isLoading,
    error,
    addTask: addTask.mutateAsync,
    updateTask: updateTask.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
  };
}
