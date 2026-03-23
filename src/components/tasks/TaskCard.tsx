import { motion, AnimatePresence } from 'framer-motion';
import { Check, MoreVertical, Lock, ChevronRight, Users } from 'lucide-react';
import { Task, Goal } from '@/types';
import { TaskWithSharing } from '@/hooks/useTasksData';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { useGradientColors } from '@/hooks/useGradientColors';
import { cn } from '@/lib/utils';
import { Icon3D } from '@/components/ui/icon-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const priorityConfig = {
  low: { color: 'bg-green-500', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', label: 'Média' },
  high: { color: 'bg-red-500', label: 'Alta' },
  urgent: { color: 'bg-red-600', label: 'Urgente' },
};

interface TaskCardProps {
  task: Task | TaskWithSharing;
  showChildren?: boolean;
  indent?: boolean;
  onEdit?: (task: Task) => void;
  onMenuClick?: (task: Task, event: React.MouseEvent) => void;
}

export function TaskCard({ task, showChildren = true, indent = false, onEdit, onMenuClick }: TaskCardProps) {
  const { toggleTaskComplete, toggleTaskExpanded, expandedTasks, tasks, goals } = useStore();
  const { celebrateCompletion } = useCelebration();
  const { color1: systemColor } = useGradientColors();
  
  // Get effective task color (system color if null)
  const effectiveColor = (task as any).color || systemColor;
  
  // Check if this is a shared task
  const taskWithSharing = task as TaskWithSharing;
  const isSharedWithMe = taskWithSharing.isSharedWithMe === true;
  const ownerUsername = taskWithSharing.ownerUsername;
  
  const isExpanded = expandedTasks.includes(task.id);
  const hasChildren = task.childrenCount > 0;
  const children = tasks.filter((t) => t.parentId === task.id);
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';

  // Get linked goal
  const linkedGoal = task.linkedGoalId ? goals.find(g => g.id === task.linkedGoalId) : null;
  
  // Get parent task
  const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  
  // Fetch assignees
  const { data: assignees } = useQuery({
    queryKey: ['task-assignees', task.id],
    queryFn: async () => {
      if (!task.assignees || task.assignees.length === 0) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', task.assignees);
      
      return data || [];
    },
    enabled: task.assignees && task.assignees.length > 0,
  });

  // Calculate progress for parent tasks
  const progress = hasChildren 
    ? Math.round((task.completedChildrenCount / task.childrenCount) * 100) 
    : 0;

  // Check if overdue
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isCompleted;
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isBlocked && !isCompleted) {
      celebrateCompletion(e);
    }
    toggleTaskComplete(task.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onEdit?.(task);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuClick?.(task, e);
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  
  // Format date
  const formattedDate = task.dueDate 
    ? format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })
    : null;

  return (
    <div className={cn(indent && 'pl-4 border-l border-border/10 ml-2')}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        onClick={handleCardClick}
        className={cn(
          'relative p-3 mb-2 rounded-xl transition-all duration-200 cursor-pointer',
          'bg-card/90 backdrop-blur-sm border',
          isOverdue ? 'border-destructive/50' : 'border-border/50',
          'hover:border-border hover:shadow-md',
          isCompleted && 'opacity-60'
        )}
      >
        {/* Header: Icon + Priority + Menu + Checkbox */}
        <div className="flex items-center justify-between mb-2">
          {/* Left side: Icon */}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${effectiveColor}20` }}
          >
            <Icon3D icon={task.icon || 'check'} size="sm" />
          </div>
          
          {/* Right side: Priority dot + Menu + Checkbox */}
          <div className="flex items-center gap-2">
            {/* Priority dot */}
            <div 
              className={cn('w-2.5 h-2.5 rounded-full', priority.color)} 
              title={priority.label}
            />
            
            {/* Menu button */}
            <button
              onClick={handleMenuClick}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {/* Checkbox */}
            <button
              onClick={handleComplete}
              disabled={isBlocked}
              className={cn(
                'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
                isCompleted
                  ? 'bg-status-completed border-status-completed'
                  : isBlocked
                  ? 'border-status-blocked/50 cursor-not-allowed bg-status-blocked/10'
                  : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
              )}
            >
              <AnimatePresence>
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </motion.div>
                )}
                {isBlocked && !isCompleted && (
                  <Lock className="h-3 w-3 text-status-blocked/70" />
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-medium text-sm text-foreground line-clamp-2 mb-1',
          isCompleted && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </h3>

        {/* Shared indicator */}
        {isSharedWithMe && ownerUsername && (
          <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2 py-1 rounded-md mb-2 w-fit">
            <Users className="h-3 w-3" />
            <span>Compartilhada por @{ownerUsername}</span>
          </div>
        )}

        {/* Parent Task (if exists) */}
        {parentTask && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
            <span>📁</span>
            <span className="truncate">{parentTask.title}</span>
          </div>
        )}

        {/* Progress bar (if has subtasks) */}
        {hasChildren && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{task.completedChildrenCount}/{task.childrenCount} subtarefas</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Footer: Date + Assignees/Meta */}
        <div className="flex items-center justify-between">
          {/* Date */}
          <div className={cn(
            'text-[11px] flex items-center gap-1',
            isOverdue ? 'text-destructive font-medium' :
            isDueToday ? 'text-yellow-600 dark:text-yellow-400' :
            'text-muted-foreground'
          )}>
            {isOverdue && <span>⚠️</span>}
            {task.dueDate && (
              <>
                <span>📅</span>
                <span>{isDueToday ? 'Hoje' : formattedDate}</span>
              </>
            )}
          </div>

          {/* Assignees avatars OR Goal badge */}
          {assignees && assignees.length > 1 ? (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.user_id} className="w-5 h-5 border border-background">
                  {assignee.avatar_url ? (
                    <AvatarImage src={assignee.avatar_url} alt={assignee.username || ''} />
                  ) : (
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {assignee.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground border border-background">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          ) : linkedGoal ? (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
              🎯 {linkedGoal.title}
            </span>
          ) : null}
        </div>

        {/* Completed status */}
        {isCompleted && task.completedAt && (
          <div className="mt-2 pt-2 border-t border-border/10">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              Concluída em {format(new Date(task.completedAt), 'dd/MM', { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Expand button for children */}
        {hasChildren && showChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskExpanded(task.id);
            }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </button>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && showChildren && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TaskCard key={child.id} task={child} indent onEdit={onEdit} onMenuClick={onMenuClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
