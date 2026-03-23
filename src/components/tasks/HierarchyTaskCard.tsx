import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { Task } from '@/types';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssigneesAvatars } from '@/components/shared/AssigneesAvatars';
import { Icon3D } from '@/components/ui/icon-picker';
import { Progress } from '@/components/ui/progress';

const priorityConfig = {
  low: { color: 'bg-green-500', text: 'text-green-400', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Média' },
  high: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Alta' },
  urgent: { color: 'bg-red-500', text: 'text-red-400', label: 'Urgente' },
};

interface HierarchyTaskCardProps {
  task: Task & { assignees?: string[] };
  onNavigateInto?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export function HierarchyTaskCard({ task, onEdit }: HierarchyTaskCardProps) {
  const { tasks, expandedTasks, toggleTaskExpanded, toggleTaskComplete } = useStore();
  const { celebrateCompletion } = useCelebration();
  
  const children = tasks.filter(t => t.parentId === task.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedTasks.includes(task.id);
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';
  
  const completedChildren = children.filter(c => c.status === 'completed').length;
  const progress = hasChildren ? Math.round((completedChildren / children.length) * 100) : 0;

  // Check if overdue
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isOverdue = dueDate && !isCompleted ? isPast(startOfDay(dueDate)) && !isDueToday : false;

  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  // Format date
  const formattedDate = dueDate ? format(dueDate, 'dd/MM', { locale: ptBR }) : null;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onEdit?.(task);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleTaskExpanded(task.id);
    }
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isBlocked && !isCompleted) {
      celebrateCompletion(e);
    }
    toggleTaskComplete(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'rounded-xl border',
        'bg-card/50 backdrop-blur-md border-border/10',
        isCompleted && 'opacity-20 grayscale bg-muted/20'
      )}
    >
      {/* Main content */}
      <div onClick={handleCardClick} className="p-3 cursor-pointer">
        <div className="flex items-center gap-3">
          {/* Expand button */}
          {hasChildren && (
            <button
              onClick={handleToggleExpand}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
          )}

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

            {/* Row 2: Priority */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', priority.color)} />
                <span className={priority.text}>{priority.label}</span>
              </div>
              
              {isBlocked && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="text-destructive">🚫 Bloqueada</span>
                </>
              )}
            </div>

            {/* Row 3: Progress bar (if has children) */}
            {hasChildren && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedChildren}/{children.length} subtarefas</span>
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
              {task.assignees && task.assignees.length > 0 && (
                <AssigneesAvatars assigneeIds={task.assignees} size="sm" maxVisible={3} />
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
      </div>

      {/* Expanded children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50"
          >
            <div className="p-3 space-y-2">
              {children.map(child => (
                <ChildTaskCard
                  key={child.id}
                  task={child}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Child task card - simplified version matching SimpleTaskCard design
interface ChildTaskCardProps {
  task: Task & { assignees?: string[] };
  onEdit?: (task: Task) => void;
}

function ChildTaskCard({ task, onEdit }: ChildTaskCardProps) {
  const { tasks, toggleTaskComplete, expandedTasks, toggleTaskExpanded } = useStore();
  const { celebrateCompletion } = useCelebration();
  
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';
  
  const children = tasks.filter(t => t.parentId === task.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedTasks.includes(task.id);
  const completedChildren = children.filter(c => c.status === 'completed').length;
  const progress = hasChildren ? Math.round((completedChildren / children.length) * 100) : 0;

  // Check if overdue
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isOverdue = dueDate && !isCompleted ? isPast(startOfDay(dueDate)) && !isDueToday : false;

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const formattedDate = dueDate ? format(dueDate, 'dd/MM', { locale: ptBR }) : null;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleTaskExpanded(task.id);
    }
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isBlocked && !isCompleted) {
      celebrateCompletion(e);
    }
    toggleTaskComplete(task.id);
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-muted/50 transition-all',
        isCompleted && 'opacity-60'
      )}
    >
      <div 
        onClick={() => onEdit?.(task)}
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/80 rounded-xl transition-colors"
      >
        {/* Expand button */}
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-background transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title + Icon */}
          <div className="flex items-center gap-2">
            {task.icon && task.icon !== 'none' && (
              <Icon3D icon={task.icon} size="xs" className="shrink-0" />
            )}
            <span className={cn(
              'text-sm truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className={cn('w-1.5 h-1.5 rounded-full', priority.color)} />
              <span className={priority.text}>{priority.label}</span>
            </div>
            
            {hasChildren && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{completedChildren}/{children.length}</span>
              </>
            )}

            {isBlocked && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-destructive">🚫</span>
              </>
            )}

            <span className="text-muted-foreground/50">•</span>
            <span className={cn(
              isOverdue && !isCompleted ? 'text-destructive' : 
              isDueToday ? 'text-destructive' : ''
            )}>
              {isOverdue && !isCompleted && '⚠️ '}
              {isDueToday ? 'Hoje' : formattedDate || 'Sem prazo'}
            </span>
          </div>

          {/* Progress bar for children */}
          {hasChildren && (
            <Progress value={progress} className="h-1" />
          )}
        </div>

        {/* Checkbox */}
        <button
          onClick={handleComplete}
          disabled={isBlocked}
          className={cn(
            'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
            isCompleted
              ? 'bg-primary border-primary'
              : isBlocked
              ? 'border-muted-foreground/30 cursor-not-allowed'
              : 'border-border hover:border-primary'
          )}
        >
          {isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>
      </div>

      {/* Nested children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3"
          >
            <div className="space-y-2 pl-5 border-l border-border/50">
              {children.map(child => (
                <ChildTaskCard
                  key={child.id}
                  task={child}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
