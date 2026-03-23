import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye } from 'lucide-react';
import { Task } from '@/types';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { useGradientColors } from '@/hooks/useGradientColors';
import { cn } from '@/lib/utils';
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssigneesAvatars } from '@/components/shared/AssigneesAvatars';
import { Icon3D } from '@/components/ui/icon-picker';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const priorityConfig = {
  low: { color: 'bg-green-500', text: 'text-green-400', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Média' },
  high: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Alta' },
  urgent: { color: 'bg-red-500', text: 'text-red-400', label: 'Urgente' },
};

interface SimpleTaskCardProps {
  task: Task & { assignees?: string[] };
  onEdit?: (task: Task) => void;
}

export function SimpleTaskCard({ task, onEdit }: SimpleTaskCardProps) {
  const { toggleTaskComplete, tasks } = useStore();
  const { celebrateCompletion } = useCelebration();
  const { contrastColor } = useGradientColors();
  
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  
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

  // Get level label
  const getLevelLabel = () => {
    switch (task.level) {
      case 'milestone': return 'Milestone';
      case 'subtask': return 'Subtarefa';
      case 'task':
      default: return 'Tarefa';
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setActionMenuOpen(true);
  };

  const handleComplete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isBlocked && !isCompleted && e) {
      celebrateCompletion(e);
    }
    toggleTaskComplete(task.id);
    setActionMenuOpen(false);
  };

  const handleViewDetails = () => {
    setActionMenuOpen(false);
    onEdit?.(task);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        onClick={handleCardClick}
        className={cn(
          'p-3 rounded-xl border cursor-pointer transition-colors duration-200',
          'bg-card/50 backdrop-blur-md border-border/10',
          isCompleted && 'bg-muted/40 border-border/5'
        )}
      >
        <div className={cn(
          'flex items-center gap-3',
          isCompleted && 'grayscale opacity-50 [&_*]:!text-muted-foreground'
        )}>
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
      </motion.div>

      {/* Action Menu - Centered Dialog */}
      <Dialog open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
        <DialogContent className="max-w-[280px] p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>{task.title}</DialogTitle>
          </VisuallyHidden>
          {/* Header with icon and title - centered */}
          <div className="flex flex-col items-center text-center p-5 pb-4">
            {task.icon && task.icon !== 'none' && (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-muted/50">
                <Icon3D icon={task.icon} size="md" />
              </div>
            )}
            <h3 className="font-semibold text-base text-foreground">
              {task.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{getLevelLabel()}</p>
          </div>
          
          {/* Action buttons - centered */}
          <div className="p-3 pt-0 flex flex-col gap-2">
            <button
              onClick={handleViewDetails}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              Ver detalhes
            </button>
            <button
              onClick={() => handleComplete()}
              disabled={isBlocked}
              className={cn(
                "flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isCompleted 
                  ? "bg-muted/50 hover:bg-muted text-muted-foreground"
                  : "gradient-bg",
                isBlocked && "opacity-50 cursor-not-allowed"
              )}
              style={!isCompleted && !isBlocked ? { color: contrastColor } : undefined}
            >
              <Check className="h-4 w-4" style={!isCompleted && !isBlocked ? { color: contrastColor } : undefined} />
              {isCompleted ? 'Desmarcar conclusão' : 'Concluir tarefa'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}