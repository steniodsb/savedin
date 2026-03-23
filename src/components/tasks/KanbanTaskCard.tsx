import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon3D } from '@/components/ui/icon-picker';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { AssigneesAvatars } from '@/components/shared/AssigneesAvatars';

interface KanbanTaskCardProps {
  task: Task & { assignees?: string[] };
  onEdit: (task: Task) => void;
  isDragging?: boolean;
}

const priorityConfig = {
  low: { color: 'bg-green-500', text: 'text-green-400', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Média' },
  high: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Alta' },
  urgent: { color: 'bg-red-500', text: 'text-red-400', label: 'Urgente' },
};

export function KanbanTaskCard({ task, onEdit, isDragging }: KanbanTaskCardProps) {
  const { toggleTaskComplete, tasks } = useStore();
  const { celebrateCompletion } = useCelebration();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';

  // Get parent task
  const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  
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

  // Format date
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
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-3 rounded-xl border cursor-grab active:cursor-grabbing",
        "bg-card/50 backdrop-blur-md border-border/10",
        isSortableDragging && "opacity-50 shadow-lg scale-105",
        isDragging && "shadow-xl",
        isCompleted && "opacity-20 grayscale bg-muted/20"
      )}
      onClick={() => onEdit(task)}
      {...attributes}
      {...listeners}
    >
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
                <div className="flex items-center gap-1 truncate max-w-[100px]">
                  <span>📁</span>
                  <span className="truncate">{parentTask.title}</span>
                </div>
              </>
            )}

            {isBlocked && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-destructive">🚫</span>
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
            {task.assignees && task.assignees.length > 0 && (
              <AssigneesAvatars assigneeIds={task.assignees} size="sm" maxVisible={2} />
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
}
