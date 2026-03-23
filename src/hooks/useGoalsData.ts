import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Goal, GoalMilestone, GoalCategory, GoalStatus, GoalScope } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  icon: string;
  color: string;
  start_date: string | null;
  end_date: string | null;
  parent_id: string | null;
  depth: number;
  children_ids: string[] | null;
  is_measurable: boolean;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  goal_type: string | null;
  scope: string | null;
  value_unit: string | null;
  group_id: string | null;
  is_descending: boolean | null;
  status: GoalStatus;
  progress: number;
  created_at: string;
  achieved_at: string | null;
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  title: string;
  quarter: number | null;
  month: number | null;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

const transformGoalRow = (row: GoalRow, milestones: MilestoneRow[]): Goal => ({
  id: row.id,
  title: row.title,
  description: row.description || undefined,
  category: row.category,
  icon: row.icon,
  color: row.color,
  startDate: row.start_date || undefined,
  endDate: row.end_date || undefined,
  parentId: row.parent_id,
  depth: row.depth,
  childrenIds: row.children_ids || [],
  isMeasurable: row.is_measurable,
  targetValue: row.target_value || undefined,
  currentValue: row.current_value || undefined,
  unit: row.unit || undefined,
  goalType: (row.goal_type as 'project' | 'measurable') || 'project',
  scope: (row.scope as GoalScope) || undefined,
  valueUnit: row.value_unit || undefined,
  groupId: row.group_id || undefined,
  isDescending: row.is_descending || false,
  milestones: milestones
    .filter(m => m.goal_id === row.id)
    .map(m => ({
      id: m.id,
      title: m.title,
      quarter: m.quarter as 1 | 2 | 3 | 4 | undefined,
      month: m.month || undefined,
      targetDate: m.target_date || undefined,
      isCompleted: m.is_completed,
      completedAt: m.completed_at || undefined,
      notes: m.notes || undefined,
    })),
  status: row.status,
  progress: row.progress,
  createdAt: row.created_at,
  achievedAt: row.achieved_at || undefined,
});

export function useGoalsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper function to recalculate parent goal progress based on children average
  const recalculateParentProgress = async (parentId: string) => {
    if (!user) return;

    // Get parent goal to find its children
    const { data: parentGoal } = await supabase
      .from('goals')
      .select('children_ids')
      .eq('id', parentId)
      .single();

    if (!parentGoal || !parentGoal.children_ids || parentGoal.children_ids.length === 0) return;

    // Get all children goals
    const { data: childrenGoals } = await supabase
      .from('goals')
      .select('progress, status')
      .in('id', parentGoal.children_ids);

    if (!childrenGoals || childrenGoals.length === 0) return;

    // Calculate average progress
    const totalProgress = childrenGoals.reduce((sum, child) => sum + (child.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / childrenGoals.length);

    // Determine parent status based on children
    const allAchieved = childrenGoals.every(c => c.status === 'achieved');
    const anyInProgress = childrenGoals.some(c => c.status === 'in_progress');
    
    let newStatus: GoalStatus = 'not_started';
    if (allAchieved) {
      newStatus = 'achieved';
    } else if (anyInProgress || averageProgress > 0) {
      newStatus = 'in_progress';
    }

    // Update parent goal
    await supabase
      .from('goals')
      .update({ 
        progress: averageProgress,
        status: newStatus,
        achieved_at: allAchieved ? new Date().toISOString() : null,
      })
      .eq('id', parentId);

    // Recursively update grandparent if exists
    const { data: parent } = await supabase
      .from('goals')
      .select('parent_id')
      .eq('id', parentId)
      .single();

    if (parent?.parent_id) {
      await recalculateParentProgress(parent.parent_id);
    }
  };

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['goals', user?.id],
    queryFn: async (): Promise<Goal[]> => {
      if (!user) return [];
      
      const [goalsRes, milestonesRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('goal_milestones')
          .select('*')
      ]);

      if (goalsRes.error) throw goalsRes.error;
      if (milestonesRes.error) throw milestonesRes.error;

      const milestones = milestonesRes.data as MilestoneRow[];
      const goalsData = (goalsRes.data as unknown as GoalRow[]).map(g => transformGoalRow(g, milestones));
      
      return goalsData;
    },
    enabled: !!user,
    initialData: [],
  });

  const addGoal = useMutation({
    mutationFn: async (goal: Goal) => {
      if (!user) throw new Error('User not authenticated');

      // First insert the goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: goal.title,
          description: goal.description || null,
          category: goal.category,
          icon: goal.icon,
          color: goal.color,
          start_date: goal.startDate || null,
          end_date: goal.endDate || null,
          parent_id: goal.parentId || null,
          depth: goal.depth || 0,
          children_ids: goal.childrenIds || [],
          is_measurable: goal.isMeasurable,
          target_value: goal.targetValue || null,
          current_value: goal.currentValue || null,
          unit: goal.unit || null,
          goal_type: goal.goalType || 'project',
          scope: goal.scope || null,
          value_unit: goal.valueUnit || null,
          status: goal.status,
          progress: goal.progress,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Update parent's children_ids if this is a child goal
      if (goal.parentId) {
        const { data: parentGoal } = await supabase
          .from('goals')
          .select('children_ids')
          .eq('id', goal.parentId)
          .single();

        if (parentGoal) {
          const newChildrenIds = [...(parentGoal.children_ids || []), goalData.id];
          await supabase
            .from('goals')
            .update({ children_ids: newChildrenIds })
            .eq('id', goal.parentId);
        }

        // Recalculate parent progress after adding child
        await recalculateParentProgress(goal.parentId);
      }

      // Then insert milestones if any
      if (goal.milestones.length > 0) {
        const milestoneInserts = goal.milestones.map(m => ({
          goal_id: goalData.id,
          title: m.title,
          quarter: m.quarter || null,
          month: m.month || null,
          target_date: m.targetDate || null,
          is_completed: m.isCompleted,
          completed_at: m.completedAt || null,
          notes: m.notes || null,
        }));

        const { error: milestonesError } = await supabase
          .from('goal_milestones')
          .insert(milestoneInserts);

        if (milestonesError) throw milestonesError;
      }

      return goalData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar meta: ' + error.message);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
      if (updates.depth !== undefined) updateData.depth = updates.depth;
      if (updates.childrenIds !== undefined) updateData.children_ids = updates.childrenIds;
      if (updates.isMeasurable !== undefined) updateData.is_measurable = updates.isMeasurable;
      if (updates.targetValue !== undefined) updateData.target_value = updates.targetValue;
      if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;
      if (updates.unit !== undefined) updateData.unit = updates.unit;
      if (updates.goalType !== undefined) updateData.goal_type = updates.goalType;
      if (updates.scope !== undefined) updateData.scope = updates.scope;
      if (updates.valueUnit !== undefined) updateData.value_unit = updates.valueUnit;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.achievedAt !== undefined) updateData.achieved_at = updates.achievedAt;

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // If progress or status was updated, recalculate parent progress
      if (updates.progress !== undefined || updates.status !== undefined) {
        const { data: goal } = await supabase
          .from('goals')
          .select('parent_id')
          .eq('id', id)
          .single();

        if (goal?.parent_id) {
          await recalculateParentProgress(goal.parent_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar meta: ' + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Get goal to check if it has a parent
      const { data: goal } = await supabase
        .from('goals')
        .select('parent_id')
        .eq('id', id)
        .single();

      const parentId = goal?.parent_id;

      // Remove from parent's children_ids if exists
      if (parentId) {
        const { data: parentGoal } = await supabase
          .from('goals')
          .select('children_ids')
          .eq('id', parentId)
          .single();

        if (parentGoal) {
          const newChildrenIds = (parentGoal.children_ids || []).filter((cid: string) => cid !== id);
          await supabase
            .from('goals')
            .update({ children_ids: newChildrenIds })
            .eq('id', parentId);
        }
      }

      // Soft delete - move to trash
      const { error } = await supabase
        .from('goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Recalculate parent progress after deletion
      if (parentId) {
        await recalculateParentProgress(parentId);
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Meta movida para lixeira', {
        description: 'Será excluída em 24h',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await supabase.from('goals').update({ deleted_at: null }).eq('id', id);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            toast.success('Ação desfeita');
          }
        },
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Erro ao excluir meta: ' + error.message);
    },
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current milestone state
      const { data: milestone, error: fetchError } = await supabase
        .from('goal_milestones')
        .select('is_completed')
        .eq('id', milestoneId)
        .single();

      if (fetchError) throw fetchError;

      const newState = !milestone.is_completed;
      
      const { error } = await supabase
        .from('goal_milestones')
        .update({
          is_completed: newState,
          completed_at: newState ? new Date().toISOString() : null,
        })
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar marco: ' + error.message);
    },
  });

  const addMilestone = useMutation({
    mutationFn: async ({ goalId, milestone }: { goalId: string; milestone: GoalMilestone }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('goal_milestones').insert({
        goal_id: goalId,
        title: milestone.title,
        quarter: milestone.quarter || null,
        month: milestone.month || null,
        target_date: milestone.targetDate || null,
        is_completed: milestone.isCompleted,
        completed_at: milestone.completedAt || null,
        notes: milestone.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar marco: ' + error.message);
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('goal_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir marco: ' + error.message);
    },
  });

  return {
    goals: goals ?? [],
    isLoading,
    addGoal: addGoal.mutateAsync,
    updateGoal: updateGoal.mutateAsync,
    deleteGoal: deleteGoal.mutateAsync,
    toggleMilestone: toggleMilestone.mutateAsync,
    addMilestone: addMilestone.mutateAsync,
    deleteMilestone: deleteMilestone.mutateAsync,
  };
}