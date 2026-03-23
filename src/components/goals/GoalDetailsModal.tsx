import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit2, Trash2, Check, Plus, Archive, 
  Calendar, FolderTree, BarChart3, ArrowUpRight,
  ArrowDownRight, TrendingUp, ListTodo, Target, Repeat, Link2, Unlink
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GoalFormModal } from '@/components/goals/GoalFormModal';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { useGoalsData } from '@/hooks/useGoalsData';
import { useTasksData } from '@/hooks/useTasksData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon3D } from '@/components/ui/icon-picker';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface GoalDetailsModalProps {
  goalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface ProgressHistoryItem {
  id: string;
  goal_id: string;
  previous_value: number;
  new_value: number;
  difference: number;
  notes: string | null;
  created_at: string;
}

export function GoalDetailsModal({ goalId, open, onOpenChange }: GoalDetailsModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { goals, updateGoal, deleteGoal } = useGoalsData();
  const { tasks } = useTasksData();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  
  const [newProgressValue, setNewProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  // Find goal from cache
  const goal = useMemo(() => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId) || null;
  }, [goalId, goals]);

  // Fetch goal group
  const { data: goalGroup } = useQuery({
    queryKey: ['goal-group', goal?.id],
    queryFn: async () => {
      if (!goal) return null;
      // Get goal with group info
      const { data } = await supabase
        .from('goals')
        .select('group_id')
        .eq('id', goal.id)
        .single();
      
      if (!data?.group_id) return null;
      
      const { data: group } = await supabase
        .from('goal_groups')
        .select('*')
        .eq('id', data.group_id)
        .single();
      
      return group;
    },
    enabled: !!goal,
  });

  // Fetch category
  const { data: category } = useQuery({
    queryKey: ['goal-category', goal?.id],
    queryFn: async () => {
      if (!goal) return null;
      const { data } = await supabase
        .from('goals')
        .select('category_id')
        .eq('id', goal.id)
        .single();
      
      if (!data?.category_id) return null;
      
      const { data: cat } = await supabase
        .from('categories')
        .select('*')
        .eq('id', data.category_id)
        .single();
      
      return cat;
    },
    enabled: !!goal,
  });

  // Fetch linked tasks (for project type)
  const linkedTasks = useMemo(() => {
    if (!goal) return [];
    return tasks.filter(t => t.linkedGoalId === goal.id && !t.isArchived);
  }, [goal, tasks]);

  // Fetch linked habits
  const { data: linkedHabits = [] } = useQuery({
    queryKey: ['linked-habits', goalId],
    queryFn: async () => {
      if (!goalId || !user) return [];
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('linked_goal_id', goalId)
        .is('deleted_at', null);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!goalId && !!user,
  });

  // Fetch progress history (for measurable type)
  const { data: progressHistory, isLoading: historyLoading } = useQuery<ProgressHistoryItem[]>({
    queryKey: ['goal-progress-history', goalId],
    queryFn: async () => {
      if (!goalId) return [];
      const { data, error } = await supabase
        .from('goal_progress_history')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []) as ProgressHistoryItem[];
    },
    enabled: !!goalId && goal?.goalType === 'measurable',
  });

  // Calculate progress correctly based on goal direction
  // isDescending = true for goals where lower values mean progress (e.g., weight loss)
  // isDescending = false for goals where higher values mean progress (e.g., savings)
  const calculateProgress = (current: number, target: number, initial: number, isDesc: boolean) => {
    if (isDesc) {
      // Descending goal (weight loss, etc.)
      // Progress = how much we've reduced from initial toward target
      const totalToLose = initial - target;
      if (totalToLose <= 0) return 100;
      const actualLoss = initial - current;
      return Math.min(100, Math.max(0, Math.round((actualLoss / totalToLose) * 100)));
    } else {
      // Ascending goal (savings, etc.)
      if (target <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
    }
  };

  // Use the isDescending flag from the goal
  const isDescendingGoal = goal?.isDescending || false;

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ newValue, notes }: { newValue: number; notes: string }) => {
      if (!goal || !user) throw new Error('Dados inválidos');
      
      const previousValue = goal.currentValue || 0;
      const difference = newValue - previousValue;
      const target = goal.targetValue || 0;
      const isDesc = goal.isDescending || false;
      
      // For descending goals, we need to track the initial value
      // The initial value is stored in the first progress history entry, or we use previous as approximation
      // For now, we'll estimate progress based on current values
      
      // Calculate progress based on goal direction
      let newProgress = 0;
      if (target > 0) {
        if (isDesc) {
          // For descending goals (weight loss): 
          // Progress is calculated relative to how far we've come from start to target
          // We estimate initial from history or use a reasonable approximation
          // For simplicity: if current <= target, 100%. Otherwise, estimate.
          if (newValue <= target) {
            newProgress = 100;
          } else {
            // Approximate: use previous value as reference point if it's higher
            const estimatedInitial = Math.max(previousValue, newValue);
            const totalToLose = estimatedInitial - target;
            const actualLoss = estimatedInitial - newValue;
            newProgress = totalToLose > 0 ? Math.round((actualLoss / totalToLose) * 100) : 0;
          }
        } else {
          // For ascending goals
          newProgress = Math.min(100, Math.round((newValue / target) * 100));
        }
      }

      // Update goal
      await updateGoal({ 
        id: goal.id, 
        updates: { 
          currentValue: newValue,
          progress: newProgress,
          status: newProgress >= 100 ? 'achieved' : 'in_progress'
        } 
      });

      // Insert history
      await supabase.from('goal_progress_history').insert({
        goal_id: goal.id,
        previous_value: previousValue,
        new_value: newValue,
        difference,
        notes: notes || null,
      });

      return { difference, newProgress, isDesc };
    },
    onSuccess: ({ newProgress, isDesc, difference }) => {
      queryClient.invalidateQueries({ queryKey: ['goal-progress-history', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowProgressModal(false);
      setNewProgressValue('');
      setProgressNotes('');
      
      if (newProgress >= 100) {
        toast.success('🎉 Meta concluída! Parabéns!');
      } else {
        // For descending goals, negative difference is good
        const isGoodProgress = isDesc ? difference < 0 : difference > 0;
        if (isGoodProgress) {
          toast.success('Progresso atualizado! 💪');
        } else {
          toast.success('Progresso atualizado!');
        }
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar progresso: ' + (error as Error).message);
    },
  });

  // Handlers
  const handleArchive = async () => {
    if (!goal) return;
    await updateGoal({ id: goal.id, updates: { status: 'abandoned' } });
    toast.success('Meta arquivada');
    setShowArchiveConfirm(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!goal) return;
    await deleteGoal(goal.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleComplete = async () => {
    if (!goal) return;
    await updateGoal({ 
      id: goal.id, 
      updates: { 
        status: 'achieved', 
        progress: 100,
        achievedAt: new Date().toISOString()
      } 
    });
    toast.success('🎉 Meta concluída! Parabéns!');
    setShowCompleteConfirm(false);
  };

  const handleUpdateProgress = () => {
    const incrementValue = parseFloat(newProgressValue);
    if (isNaN(incrementValue) || incrementValue < 0) {
      toast.error('Valor inválido');
      return;
    }
    
    // Calculate new value based on increment
    const currentValue = goal?.currentValue || 0;
    const newValue = isDescendingGoal 
      ? currentValue - incrementValue  // Subtract for descending goals
      : currentValue + incrementValue; // Add for ascending goals
    
    updateProgressMutation.mutate({ newValue, notes: progressNotes });
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!goal?.endDate) return null;
    const deadline = parseISO(goal.endDate);
    const today = new Date();
    const days = differenceInDays(deadline, today);
    return days;
  };

  const daysRemaining = getDaysRemaining();

  // Calculate progress difference preview (now it's the increment/decrement value)
  const progressDifference = useMemo(() => {
    if (!newProgressValue || !goal) return null;
    const incrementValue = parseFloat(newProgressValue);
    if (isNaN(incrementValue) || incrementValue < 0) return null;
    // For descending goals, the increment is subtracted; for ascending, it's added
    return isDescendingGoal ? -incrementValue : incrementValue;
  }, [newProgressValue, goal, isDescendingGoal]);

  if (!goal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-6">
          <div className="space-y-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const completedTasks = linkedTasks.filter(t => t.status === 'completed').length;
  const totalTasks = linkedTasks.length;
  const progressPercent = goal.progress || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="relative p-6 pb-4">
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </motion.button>

            <div className="flex items-start gap-4">
              {/* Icon - only show if icon exists and is not 'none' */}
              {goal.icon && goal.icon !== 'none' && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ 
                    backgroundColor: `${goal.color}15`,
                  }}
                >
                  <Icon3D icon={goal.icon} size="xl" />
                </motion.div>
              )}

              {/* Name and badges */}
              <div className="flex-1 min-w-0 pr-10">
                <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
                  {goal.title}
                </h2>
                
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type badge */}
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "gap-1",
                      goal.goalType === 'measurable' 
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    )}
                  >
                    {goal.goalType === 'measurable' ? (
                      <>
                        <BarChart3 className="h-3 w-3" />
                        Meta Mensurável
                      </>
                    ) : (
                      <>
                        <FolderTree className="h-3 w-3" />
                        Projeto Complexo
                      </>
                    )}
                  </Badge>

                  {/* Group badge */}
                  {goalGroup && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 gap-1">
                      <Icon3D icon={goalGroup.icon} size="xs" /> {goalGroup.name}
                    </Badge>
                  )}

                  {/* Category badge */}
                  {category && (
                    <Badge variant="secondary" className="bg-muted gap-1">
                      <Icon3D icon={category.icon} size="xs" /> {category.name}
                    </Badge>
                  )}

                  {/* Status badge */}
                  {goal.status === 'achieved' && (
                    <Badge className="bg-green-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Concluída
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="px-6 pb-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Progresso Geral
              </p>
              
              {/* Progress bar */}
              <div className="h-3 rounded-full bg-background/60 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* Progress text */}
                <div>
                  {goal.goalType === 'measurable' && goal.targetValue ? (
                    isDescendingGoal ? (
                      // For descending goals: show current value and target
                      <p className="text-lg font-semibold">
                        {(goal.currentValue || 0).toLocaleString('pt-BR')}
                        <span className="text-muted-foreground font-normal"> / {goal.targetValue.toLocaleString('pt-BR')}</span>
                        {goal.valueUnit && ` ${goal.valueUnit}`}
                      </p>
                    ) : (
                      // For ascending goals: show current / target
                      <p className="text-lg font-semibold">
                        {goal.valueUnit === 'R$' && 'R$ '}
                        {(goal.currentValue || 0).toLocaleString('pt-BR')}
                        <span className="text-muted-foreground font-normal"> / {goal.targetValue.toLocaleString('pt-BR')}</span>
                        {goal.valueUnit && goal.valueUnit !== 'R$' && ` ${goal.valueUnit}`}
                      </p>
                    )
                  ) : (
                    <p className="text-lg font-semibold">
                      {completedTasks} de {totalTasks} tarefas
                    </p>
                  )}
                </div>

                {/* Percentage */}
                <span className="text-2xl font-bold text-primary">
                  {progressPercent}%
                </span>
              </div>

              {/* Deadline info */}
              <div className="mt-3 pt-3 border-t border-primary/10">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {goal.endDate ? (
                    <>
                      <span>Prazo: {format(parseISO(goal.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                      {daysRemaining !== null && (
                        <span className={cn(
                          "ml-auto font-medium",
                          daysRemaining < 0 && "text-red-500",
                          daysRemaining === 0 && "text-yellow-500",
                          daysRemaining > 0 && "text-muted-foreground"
                        )}>
                          {daysRemaining < 0 
                            ? `${Math.abs(daysRemaining)} dias atrasado`
                            : daysRemaining === 0
                              ? "Prazo hoje!"
                              : `${daysRemaining} dias restantes`}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sem prazo definido</span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Description */}
          {goal.description && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </div>
          )}

          <div className="border-t border-border mx-6" />

          {/* Content based on type */}
          <div className="px-6 py-4">
            {goal.goalType === 'project' ? (
              /* PROJECT TYPE - Linked Tasks */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tarefas Vinculadas ({totalTasks})
                  </h3>
                  <Button size="sm" variant="default" onClick={() => setShowCreateTaskForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tarefa
                  </Button>
                </div>

                {linkedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {/* Pending tasks first */}
                    {linkedTasks
                      .sort((a, b) => {
                        if (a.status === 'completed' && b.status !== 'completed') return 1;
                        if (a.status !== 'completed' && b.status === 'completed') return -1;
                        return 0;
                      })
                      .map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer",
                            task.status === 'completed' 
                              ? "bg-muted/30" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            task.status === 'completed'
                              ? "bg-green-500 border-green-500"
                              : "border-border"
                          )}>
                            {task.status === 'completed' && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-lg">{task.icon || '✅'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              task.status === 'completed' && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            {task.dueDate && (
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(task.dueDate), "dd/MM", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                ) : (
                  /* Empty state */
                  <div className="text-center py-8 px-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <ListTodo className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Nenhuma tarefa vinculada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Adicione tarefas que contribuem para esta meta
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setShowCreateTaskForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Tarefa
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* MEASURABLE TYPE - Values and History */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Progresso Atual
                  </h3>
                  {goal.status !== 'achieved' && (
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowProgressModal(true)}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Atualizar
                    </Button>
                  )}
                </div>

                {/* Value cards */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Initial (for descending goals) */}
                  {isDescendingGoal && progressHistory && progressHistory.length > 0 && (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Inicial</p>
                      <div className="flex flex-col items-center">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight">
                          {progressHistory[progressHistory.length - 1]?.previous_value?.toLocaleString('pt-BR') || '-'}
                        </p>
                        {goal.valueUnit && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">{goal.valueUnit}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Current */}
                  <div className={cn(
                    "p-3 rounded-xl bg-muted/50 border border-border text-center",
                    !isDescendingGoal && "col-span-1"
                  )}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Atual</p>
                    <div className="flex flex-col items-center">
                      {goal.valueUnit === 'R$' && (
                        <span className="text-[10px] text-muted-foreground mb-0.5">R$</span>
                      )}
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {(goal.currentValue || 0).toLocaleString('pt-BR')}
                      </p>
                      {goal.valueUnit && goal.valueUnit !== 'R$' && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">{goal.valueUnit}</span>
                      )}
                    </div>
                  </div>

                  {/* Target */}
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Meta</p>
                    <div className="flex flex-col items-center">
                      {goal.valueUnit === 'R$' && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 mb-0.5">R$</span>
                      )}
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
                        {(goal.targetValue || 0).toLocaleString('pt-BR')}
                      </p>
                      {goal.valueUnit && goal.valueUnit !== 'R$' && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{goal.valueUnit}</span>
                      )}
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                      {isDescendingGoal ? 'Faltam' : 'Faltam'}
                    </p>
                    {(() => {
                      const target = goal.targetValue || 0;
                      const current = goal.currentValue || 0;
                      
                      const remaining = isDescendingGoal 
                        ? current - target
                        : target - current;
                      
                      if (remaining <= 0) {
                        return (
                          <p className="text-sm font-bold text-green-600 leading-tight">✅</p>
                        );
                      }
                      
                      return (
                        <div className="flex flex-col items-center">
                          {goal.valueUnit === 'R$' && (
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 mb-0.5">R$</span>
                          )}
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400 leading-tight">
                            {remaining.toLocaleString('pt-BR')}
                          </p>
                          {goal.valueUnit && goal.valueUnit !== 'R$' && (
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">{goal.valueUnit}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Progress Line Chart */}
                {progressHistory && progressHistory.length > 0 && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Evolução do Progresso</p>
                    <div className="h-40">
                      {(() => {
                        // Get data points from history (oldest to newest)
                        const sortedHistory = [...progressHistory].reverse();
                        const chartData = sortedHistory.map((h, idx) => ({
                          name: format(parseISO(h.created_at), 'dd/MM', { locale: ptBR }),
                          value: h.new_value,
                          index: idx
                        }));
                        
                        // Add target line reference
                        const targetValue = goal.targetValue || 0;
                        
                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                tickLine={false}
                              />
                              <YAxis 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                                domain={isDescendingGoal 
                                  ? ['dataMin - 1', 'dataMax + 1']
                                  : [0, 'dataMax + 10']
                                }
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px'
                                }}
                                formatter={(value: number) => [
                                  `${value.toLocaleString('pt-BR')} ${goal.valueUnit || ''}`,
                                  'Valor'
                                ]}
                              />
                              {/* Target reference line */}
                              <Line 
                                type="monotone" 
                                dataKey={() => targetValue}
                                stroke="hsl(var(--muted-foreground))"
                                strokeDasharray="5 5"
                                strokeWidth={1}
                                dot={false}
                                name="Meta"
                              />
                              {/* Progress line */}
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={isDescendingGoal ? 'hsl(142 76% 36%)' : 'hsl(var(--primary))'}
                                strokeWidth={2}
                                dot={{ 
                                  fill: isDescendingGoal ? 'hsl(142 76% 36%)' : 'hsl(var(--primary))',
                                  strokeWidth: 0,
                                  r: 4
                                }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                    {/* Legend */}
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-3 h-0.5 rounded",
                            isDescendingGoal ? "bg-green-600" : "bg-primary"
                          )} />
                          <span>Progresso</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 rounded bg-muted-foreground border-dashed" />
                          <span>Meta: {goal.targetValue?.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <span>{progressHistory.length} atualizações</span>
                    </div>
                  </div>
                )}

                {/* Progress history */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Histórico de Atualizações
                  </h4>
                  
                  {historyLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : progressHistory && progressHistory.length > 0 ? (
                    <div className="space-y-2">
                      {progressHistory.map((item) => {
                        // For descending goals, negative difference is good (lost weight)
                        // For ascending goals, positive difference is good (gained savings)
                        const isPositiveProgress = isDescendingGoal 
                          ? item.difference < 0 
                          : item.difference > 0;
                        
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              isPositiveProgress 
                                ? "bg-green-500/20 text-green-600" 
                                : item.difference === 0
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-red-500/20 text-red-600"
                            )}>
                              {isDescendingGoal ? (
                                // For weight loss: down arrow = good
                                item.difference < 0 ? (
                                  <ArrowDownRight className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                )
                              ) : (
                                // For savings: up arrow = good
                                item.difference >= 0 ? (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDownRight className="h-3.5 w-3.5" />
                                )
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-semibold",
                                isPositiveProgress ? "text-green-600" : item.difference === 0 ? "text-muted-foreground" : "text-red-600"
                              )}>
                                {isDescendingGoal ? (
                                  item.difference < 0 
                                    ? `−${Math.abs(item.difference).toLocaleString('pt-BR')} ${goal.valueUnit || ''}`
                                    : `+${item.difference.toLocaleString('pt-BR')} ${goal.valueUnit || ''}`
                                ) : (
                                  <>
                                    {item.difference >= 0 ? '+' : ''}
                                    {goal.valueUnit === 'R$' && 'R$ '}
                                    {item.difference.toLocaleString('pt-BR')}
                                    {goal.valueUnit && goal.valueUnit !== 'R$' && ` ${goal.valueUnit}`}
                                  </>
                                )}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-foreground mt-0.5">{item.notes}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma atualização registrada ainda
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Linked Habits Section */}
          {linkedHabits.length > 0 && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Hábitos Vinculados ({linkedHabits.length})
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {linkedHabits.map((habit: any) => {
                    const contributionType = habit.contribution_type || 'none';
                    const contributionLabel = contributionType === 'none' 
                      ? 'Apenas visualização'
                      : contributionType === 'simple'
                        ? 'Contribui +1 por conclusão'
                        : contributionType === 'custom'
                          ? `Contribui +${habit.contribution_value || 0} por conclusão`
                          : 'Cria marcos automaticamente';
                    
                    const contributionIcon = contributionType === 'none' 
                      ? '👁️'
                      : contributionType === 'simple' || contributionType === 'custom'
                        ? '➕'
                        : '🎯';

                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border hover:bg-muted/50 transition-colors"
                      >
                        <Icon3D icon={habit.icon} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{habit.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>{contributionIcon}</span>
                            {contributionLabel}
                          </p>
                        </div>
                        {contributionType !== 'none' && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs shrink-0">
                            Ativo
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border mx-6" />

          {/* Footer Actions */}
          <div className="p-6 bg-muted/30 space-y-3">
            {/* Secondary actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5"
                onClick={() => setShowArchiveConfirm(true)}
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>

            {/* Primary action */}
            {goal.status !== 'achieved' && (
              <Button 
                className="w-full h-12 text-base font-semibold gradient-bg text-primary-foreground shadow-lg"
                onClick={() => setShowCompleteConfirm(true)}
              >
                <Check className="h-5 w-5 mr-2" />
                Marcar como Concluída
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <GoalFormModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        goal={goal}
        onSuccess={() => setIsEditOpen(false)}
      />

      {/* Update Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <div>
      <h3 className="text-lg font-semibold">Atualizar Progresso</h3>
              <p className="text-sm text-muted-foreground">
                {isDescendingGoal 
                  ? 'Quanto você perdeu desde a última atualização?' 
                  : 'Quanto você adicionou desde a última atualização?'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Valor Atual</p>
                <p className="text-lg font-semibold">
                  {goal?.valueUnit === 'R$' && 'R$ '}
                  {(goal?.currentValue || 0).toLocaleString('pt-BR')}
                  {goal?.valueUnit && goal.valueUnit !== 'R$' && ` ${goal.valueUnit}`}
                </p>
              </div>

              <div>
                <Label>{isDescendingGoal ? 'Valor Perdido' : 'Valor Adicionado'}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-medium text-muted-foreground">
                    {isDescendingGoal ? '−' : '+'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={newProgressValue}
                    onChange={(e) => setNewProgressValue(e.target.value)}
                    autoFocus
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    {goal?.valueUnit || ''}
                  </span>
                </div>
              </div>

              {/* Preview of new value */}
              <AnimatePresence>
                {progressDifference !== null && progressDifference !== 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg bg-green-500/10 text-green-600 text-center space-y-1"
                  >
                    <p className="text-xs text-green-600/80">Novo valor será</p>
                    <p className="text-lg font-bold">
                      {goal?.valueUnit === 'R$' && 'R$ '}
                      {((goal?.currentValue || 0) + progressDifference).toLocaleString('pt-BR')}
                      {goal?.valueUnit && goal.valueUnit !== 'R$' && ` ${goal.valueUnit}`}
                    </p>
                    <p className="text-sm font-medium">
                      {isDescendingGoal 
                        ? `✅ −${Math.abs(progressDifference).toLocaleString('pt-BR')} ${goal?.valueUnit || ''}`
                        : `✅ +${progressDifference.toLocaleString('pt-BR')} ${goal?.valueUnit || ''}`
                      }
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Ex: Bônus do trabalho"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowProgressModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleUpdateProgress}
                disabled={!newProgressValue || updateProgressMutation.isPending}
              >
                {updateProgressMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar meta?</AlertDialogTitle>
            <AlertDialogDescription>
              A meta será arquivada e não aparecerá mais na lista principal.
              Você pode restaurá-la a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              A meta será movida para a lixeira e excluída permanentemente após 24 horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation */}
      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🎉 Concluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Parabéns! Ao confirmar, a meta será marcada como concluída com 100% de progresso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              Concluir Meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Task Form */}
      <CreateTaskForm
        open={showCreateTaskForm}
        onOpenChange={setShowCreateTaskForm}
        goalId={goal?.id}
        onSuccess={() => {
          setShowCreateTaskForm(false);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />
    </>
  );
}
