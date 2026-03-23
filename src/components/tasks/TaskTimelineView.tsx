import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check } from 'lucide-react';
import { Task, Project } from '@/types';
import { format, isToday, isTomorrow, isPast, addDays, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { Icon3D } from '@/components/ui/icon-picker';
import { Progress } from '@/components/ui/progress';
import { AssigneesAvatars } from '@/components/shared/AssigneesAvatars';

interface TaskTimelineViewProps {
  tasks: Task[];
  projects: Project[];
  onEditTask: (task: Task) => void;
}

interface TimelineGroup {
  label: string;
  date: Date | null;
  tasks: Task[];
  isOverdue?: boolean;
  isToday?: boolean;
}

const priorityConfig = {
  low: { color: 'bg-green-500', text: 'text-green-400', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Média' },
  high: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Alta' },
  urgent: { color: 'bg-red-500', text: 'text-red-400', label: 'Urgente' },
};

export function TaskTimelineView({ tasks, projects, onEditTask }: TaskTimelineViewProps) {
  const { toggleTaskComplete, tasks: allTasks } = useStore();
  const { celebrateCompletion } = useCelebration();

  const timelineGroups = useMemo(() => {
    const groups: TimelineGroup[] = [];
    const today = startOfDay(new Date());

    // Filter tasks with dates
    const tasksWithDates = tasks.filter(t => t.dueDate || t.scheduledFor);

    // Group: Overdue
    const overdueTasks = tasksWithDates.filter(t => {
      const date = t.dueDate || t.scheduledFor;
      return date && isPast(new Date(date)) && !isToday(new Date(date)) && t.status !== 'completed';
    });
    if (overdueTasks.length > 0) {
      groups.push({
        label: 'Atrasadas',
        date: null,
        tasks: overdueTasks.sort((a, b) => 
          new Date(a.dueDate || a.scheduledFor!).getTime() - new Date(b.dueDate || b.scheduledFor!).getTime()
        ),
        isOverdue: true,
      });
    }

    // Group: Today
    const todayTasks = tasksWithDates.filter(t => {
      const date = t.dueDate || t.scheduledFor;
      return date && isToday(new Date(date));
    });
    if (todayTasks.length > 0) {
      groups.push({
        label: 'Hoje',
        date: today,
        tasks: todayTasks,
        isToday: true,
      });
    }

    // Group: Tomorrow
    const tomorrow = addDays(today, 1);
    const tomorrowTasks = tasksWithDates.filter(t => {
      const date = t.dueDate || t.scheduledFor;
      return date && isTomorrow(new Date(date));
    });
    if (tomorrowTasks.length > 0) {
      groups.push({
        label: 'Amanhã',
        date: tomorrow,
        tasks: tomorrowTasks,
      });
    }

    // Group: This week (next 5 days after tomorrow)
    for (let i = 2; i <= 7; i++) {
      const day = addDays(today, i);
      const dayTasks = tasksWithDates.filter(t => {
        const date = t.dueDate || t.scheduledFor;
        if (!date) return false;
        const taskDate = startOfDay(new Date(date));
        return differenceInDays(taskDate, today) === i;
      });
      if (dayTasks.length > 0) {
        groups.push({
          label: format(day, "EEEE, d 'de' MMM", { locale: ptBR }),
          date: day,
          tasks: dayTasks,
        });
      }
    }

    // Group: Later (more than 7 days)
    const laterTasks = tasksWithDates.filter(t => {
      const date = t.dueDate || t.scheduledFor;
      if (!date) return false;
      const taskDate = startOfDay(new Date(date));
      return differenceInDays(taskDate, today) > 7;
    });
    if (laterTasks.length > 0) {
      groups.push({
        label: 'Próximas semanas',
        date: null,
        tasks: laterTasks.sort((a, b) => 
          new Date(a.dueDate || a.scheduledFor!).getTime() - new Date(b.dueDate || b.scheduledFor!).getTime()
        ),
      });
    }

    // Group: No date
    const noDateTasks = tasks.filter(t => !t.dueDate && !t.scheduledFor && t.status !== 'completed');
    if (noDateTasks.length > 0) {
      groups.push({
        label: 'Sem data',
        date: null,
        tasks: noDateTasks,
      });
    }

    return groups;
  }, [tasks]);

  if (timelineGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma tarefa</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Suas tarefas com datas aparecerão aqui em ordem cronológica
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timelineGroups.map((group, groupIndex) => (
        <motion.div
          key={group.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.05 }}
        >
          {/* Group Header */}
          <div className={cn(
            'flex items-center gap-3 mb-3',
            group.isOverdue && 'text-destructive',
            group.isToday && 'text-primary'
          )}>
            <div className={cn(
              'w-3 h-3 rounded-full flex-shrink-0',
              group.isOverdue ? 'bg-destructive' : group.isToday ? 'bg-primary' : 'bg-muted-foreground/30'
            )} />
            <h3 className={cn(
              'font-semibold capitalize',
              group.isOverdue ? 'text-destructive' : group.isToday ? 'text-primary' : 'text-foreground'
            )}>
              {group.label}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {group.tasks.length}
            </span>
          </div>

          {/* Timeline Line & Tasks */}
          <div className="relative pl-6 border-l-2 border-border ml-1.5 space-y-2">
            {group.tasks.map((task, taskIndex) => {
              const isCompleted = task.status === 'completed';
              const isBlocked = task.status === 'blocked';
              
              // Get parent task
              const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
              
              // Calculate progress for parent tasks
              const hasSubtasks = task.childrenCount > 0;
              const progress = hasSubtasks 
                ? Math.round((task.completedChildrenCount / task.childrenCount) * 100) 
                : 0;

              // Check if overdue
              const dueDate = task.dueDate ? new Date(task.dueDate) : null;
              const isDueToday = dueDate ? isToday(dueDate) : false;
              const isOverdue = dueDate && !isCompleted ? isPast(startOfDay(dueDate)) && !isDueToday : false;

              const priority = priorityConfig[task.priority] || priorityConfig.medium;
              const formattedDate = dueDate ? format(dueDate, 'dd/MM', { locale: ptBR }) : null;

              const handleComplete = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isBlocked && !isCompleted) {
                  celebrateCompletion(e);
                }
                toggleTaskComplete(task.id);
              };

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: taskIndex * 0.03 }}
                  onClick={() => onEditTask(task)}
                  className={cn(
                    'relative p-3 rounded-xl border cursor-pointer',
                    'bg-card/50 backdrop-blur-md border-border/10',
                    isCompleted && 'opacity-20 grayscale bg-muted/20'
                  )}
                >
                  {/* Connector dot */}
                  <div className={cn(
                    'absolute -left-[calc(1.5rem+5px)] top-4 w-2 h-2 rounded-full',
                    isCompleted ? 'bg-green-500' : group.isOverdue ? 'bg-destructive' : 'bg-primary'
                  )} />

                  <div className="flex items-center gap-3">
                    {/* LEFT SIDE - All Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Row 1: Icon + Title */}
                      <div className="flex items-center gap-2">
                        {task.icon && task.icon !== 'none' && (
                          <Icon3D
                            icon={task.icon}
                            size="sm"
                            className="shrink-0"
                          />
                        )}
                        <span
                          className={cn(
                            'font-medium text-sm truncate',
                            isCompleted && 'line-through text-muted-foreground'
                          )}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Row 2: Priority + Parent Task */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {/* Priority */}
                        <div className="flex items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', priority.color)} />
                          <span className={priority.text}>{priority.label}</span>
                        </div>
                        
                        {/* Parent Task (Hierarchy) */}
                        {parentTask && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <div className="flex items-center gap-1 truncate max-w-[120px]">
                              <span>📁</span>
                              <span className="truncate">{parentTask.title}</span>
                            </div>
                          </>
                        )}

                        {isBlocked && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-destructive">🚫 Bloqueada</span>
                          </>
                        )}
                      </div>

                      {/* Row 3: Progress bar (if has subtasks) */}
                      {hasSubtasks && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{task.completedChildrenCount}/{task.childrenCount} subtarefas</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </div>
                      )}

                      {/* Row 4: Date + Assignees */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Date */}
                        <span
                          className={cn(
                            'text-xs',
                            isOverdue && !isCompleted ? 'text-destructive font-medium' : 
                            isDueToday ? 'text-destructive' : 
                            'text-muted-foreground'
                          )}
                        >
                          {isOverdue && !isCompleted && '⚠️ '}
                          {isDueToday ? '📅 Hoje' : formattedDate ? `📅 ${formattedDate}` : 'Sem prazo'}
                        </span>

                        {/* Assignees avatars - bottom right */}
                        {(task as Task & { assignees?: string[] }).assignees && (task as Task & { assignees?: string[] }).assignees!.length > 0 && (
                          <AssigneesAvatars assigneeIds={(task as Task & { assignees?: string[] }).assignees!} size="sm" maxVisible={3} />
                        )}
                      </div>
                    </div>

                    {/* RIGHT SIDE - Checkbox (vertically centered) */}
                    <button
                      onClick={handleComplete}
                      disabled={isBlocked}
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 self-center',
                        isCompleted
                          ? 'bg-primary border-primary'
                          : isBlocked
                          ? 'border-muted-foreground/30 cursor-not-allowed bg-muted/30'
                          : 'border-muted-foreground/30 hover:border-primary'
                      )}
                    >
                      <AnimatePresence>
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
