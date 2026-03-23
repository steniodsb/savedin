import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Edit2, Trash2, Clock, Calendar, Tag, Target, CheckCircle2, AlertCircle, Lock, ListTodo, Play, Timer, Plus, User, Users } from 'lucide-react';
import { Task, Goal } from '@/types';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { useAuth } from '@/hooks/useAuth';
import { useProfilesByIds } from '@/hooks/useProfilesByIds';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Icon3D } from '@/components/ui/icon-picker';
import { ptBR } from 'date-fns/locale';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { useTimer } from '@/hooks/useTimer';
import { TimerFullscreenView } from '@/components/timer/TimerFullscreenView';

interface TaskDetailViewProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'Em Progresso', color: 'bg-primary/10 text-primary', icon: Clock },
  blocked: { label: 'Bloqueado', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Lock },
  completed: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
};

const levelConfig = {
  project: { label: 'Projeto', icon: '📁' },
  milestone: { label: 'Marco', icon: '🎯' },
  task: { label: 'Tarefa', icon: '✓' },
  subtask: { label: 'Subtarefa', icon: '•' },
};

export function TaskDetailView({ task: initialTask, open, onOpenChange }: TaskDetailViewProps) {
  const { deleteTask, tasks, goals, toggleTaskComplete } = useStore();
  const { celebrateCompletion } = useCelebration();
  const { user } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [showTimerView, setShowTimerView] = useState(false);
  const { getTimerForItem, canStartTimer } = useTimer();

  // Get live task data from store
  const task = initialTask ? tasks.find(t => t.id === initialTask.id) || initialTask : null;
  
  // Get active timer for this task
  const activeTimer = task ? getTimerForItem(task.id, 'task') : undefined;

  // Get assignee profiles (current user + assignees)
  const assigneeIds = task?.assignees?.filter(id => id !== user?.id) || [];
  const allUserIds = user ? [user.id, ...assigneeIds] : assigneeIds;
  const { profiles } = useProfilesByIds(allUserIds);

  if (!task) return null;

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const level = levelConfig[task.level];
  const StatusIcon = status.icon;

  const linkedGoal = goals.find((g) => g.id === task.linkedGoalId);
  const parentTask = tasks.find((t) => t.id === task.parentId);
  const childTasks = tasks.filter((t) => t.parentId === task.id);
  const completedChildren = childTasks.filter((t) => t.status === 'completed').length;

  const handleDelete = () => {
    deleteTask(task.id);
    onOpenChange(false);
    toast({ title: 'Tarefa excluída' });
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    if (task.status !== 'completed') {
      celebrateCompletion(e);
    }
    toggleTaskComplete(task.id);
    toast({ 
      title: task.status === 'completed' ? 'Tarefa reaberta' : 'Tarefa concluída! 🎉' 
    });
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "d 'de' MMMM", { locale: ptBR });
  };

  return (
    <>
      <Dialog open={open && !showTimerView} onOpenChange={(v) => { if (!showTimerView) onOpenChange(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div 
            className="relative p-6 pb-5"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--card)) 100%)`
            }}
          >
            {/* Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpenChange(false)}
                className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors shadow-sm"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Level and Status Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 backdrop-blur-sm text-xs font-medium text-foreground/80 border border-border/10">
                <span>{level.icon}</span>
                {level.label}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.color)}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', priority.color)}>
                {priority.label}
              </span>
            </div>

            {/* Title */}
            <h2 className={cn(
              "text-xl font-bold text-foreground leading-tight",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h2>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Quick Complete Button */}
            {task.status !== 'blocked' && (
              <Button
                onClick={handleToggleComplete}
                variant={task.status === 'completed' ? 'outline' : 'default'}
                className="w-full gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {task.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}
              </Button>
            )}

            {/* Dates */}
            {(task.dueDate || task.startDate || task.scheduledFor) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Datas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {task.startDate && (
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground">Início</p>
                      <p className="text-sm font-medium text-foreground">{formatDate(task.startDate)}</p>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground">Prazo</p>
                      <p className="text-sm font-medium text-foreground">{formatDate(task.dueDate)}</p>
                    </div>
                  )}
                  {task.scheduledFor && (
                    <div className="p-3 rounded-xl bg-primary/10">
                      <p className="text-xs text-muted-foreground">Agendada</p>
                      <p className="text-sm font-medium text-primary">{formatDate(task.scheduledFor)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timer Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Cronômetro
              </h3>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-3">
                  {task.estimatedMinutes ? (
                    <span className="text-sm text-muted-foreground">
                      ⏱️ Estimado: <span className="font-medium text-foreground">{task.estimatedMinutes} min</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sem tempo estimado
                    </span>
                  )}
                  {task.totalTimeSpent && task.totalTimeSpent > 0 ? (
                    <span className="text-sm text-muted-foreground">
                      ⏰ Gasto: <span className="font-medium text-foreground">{task.totalTimeSpent} min</span>
                    </span>
                  ) : null}
                </div>
                
                {activeTimer ? (
                  <Button
                    onClick={() => setShowTimerView(true)}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    <Play className="h-4 w-4 animate-pulse" />
                    Ver Cronômetro Ativo
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowTimerView(true)}
                    className="w-full gap-2"
                    disabled={!canStartTimer}
                  >
                    <Play className="h-4 w-4" />
                    {canStartTimer ? 'Abrir Cronômetro' : 'Limite de cronômetros atingido'}
                  </Button>
                )}
              </div>
            </div>

            {/* Time Estimate (legacy display) */}
            {task.estimatedMinutes && task.actualMinutes && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Tempo Registrado
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="text-2xl font-bold text-foreground">{task.actualMinutes}</span>
                  <span className="text-sm text-muted-foreground">minutos reais</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    Estimado: <span className="font-medium text-foreground">{task.estimatedMinutes}min</span>
                  </span>
                </div>
              </div>
            )}

            {/* Subtasks Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  Subtarefas
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setIsAddSubtaskOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar subtarefa
                </Button>
              </div>
              {childTasks.length > 0 ? (
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progresso</span>
                      <span className="text-sm font-medium text-foreground">
                        {completedChildren}/{childTasks.length}
                      </span>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-bg rounded-full transition-all"
                        style={{ width: `${(completedChildren / childTasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Subtasks List */}
                  <div className="space-y-2">
                    {childTasks.map((subtask) => (
                      <div 
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <button
                          onClick={(e) => {
                            if (subtask.status !== 'completed') {
                              celebrateCompletion(e);
                            }
                            toggleTaskComplete(subtask.id);
                          }}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            subtask.status === 'completed'
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {subtask.status === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          )}
                        </button>
                        <span className={cn(
                          "flex-1 text-sm",
                          subtask.status === 'completed' 
                            ? "text-muted-foreground line-through" 
                            : "text-foreground"
                        )}>
                          {subtask.title}
                        </span>
                        {subtask.priority !== 'medium' && (
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            priorityConfig[subtask.priority].color
                          )}>
                            {priorityConfig[subtask.priority].label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma subtarefa criada</p>
                </div>
              )}
            </div>

            {/* Linked Goal */}
            {linkedGoal && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Meta Vinculada
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon3D icon={linkedGoal.icon} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{linkedGoal.title}</p>
                    <p className="text-xs text-muted-foreground">{linkedGoal.progress}% concluído</p>
                  </div>
                  {task.goalWeight && (
                    <Badge variant="outline" className="shrink-0">
                      Peso: {task.goalWeight}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Parent Task */}
            {parentTask && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  📁 Tarefa Pai
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="text-xl">{levelConfig[parentTask.level].icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{parentTask.title}</p>
                    <p className="text-xs text-muted-foreground">{levelConfig[parentTask.level].label}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Responsáveis */}
            {profiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Responsáveis
                </h3>
                <div className="space-y-2">
                  {profiles.map((profile, index) => {
                    const isCreator = profile.userId === user?.id;
                    const isAssignee = task.assignees?.includes(profile.userId);
                    
                    return (
                      <div 
                        key={profile.userId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/30">
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={profile.fullName || profile.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {isCreator ? 'Você' : (profile.fullName || profile.username)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isCreator ? '(criador)' : isAssignee ? '(responsável)' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Blocked By */}
            {task.blockedBy.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Bloqueado por
                </h3>
                <div className="space-y-2">
                  {task.blockedBy.map((blockerId) => {
                    const blocker = tasks.find((t) => t.id === blockerId);
                    if (!blocker) return null;
                    return (
                      <div key={blockerId} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10">
                        <Lock className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-foreground">{blocker.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">📝 Notas</h3>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                </div>
              </div>
            )}

          {/* Action Buttons Footer */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1 gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    O item será movido para a lixeira por 24h antes da exclusão definitiva.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Form */}
      <CreateTaskForm 
        task={isEditOpen ? task : null} 
        open={isEditOpen} 
        onOpenChange={(open) => {
          setIsEditOpen(open);
        }} 
      />

      {/* Add Subtask Form */}
      <CreateTaskForm 
        open={isAddSubtaskOpen} 
        onOpenChange={setIsAddSubtaskOpen}
        parentTaskId={task?.id}
        defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
      />

      {/* Timer Fullscreen View */}
      <TimerFullscreenView
        open={showTimerView}
        onClose={() => setShowTimerView(false)}
        timer={activeTimer}
        item={!activeTimer && task ? {
          id: task.id,
          type: 'task',
          name: task.title,
          estimatedTime: task.estimatedMinutes,
        } : undefined}
      />
    </>
  );
}
