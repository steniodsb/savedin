import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Check, Lock, Folder, Plus } from 'lucide-react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProjectHierarchyCardProps {
  task: Task;
  allTasks: Task[];
  depth?: number;
  isExpanded?: boolean;
  onToggleExpand: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onAddSubtask?: (parentId: string) => void;
  expandedTasks: string[];
  filter: 'all' | 'pending' | 'completed';
}

const priorityDots: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-blue-500', label: 'Baixa' },
  medium: { color: 'bg-yellow-500', label: 'Média' },
  high: { color: 'bg-red-500', label: 'Alta' },
  urgent: { color: 'bg-red-600', label: 'Urgente' },
};

const levelLabels: Record<number, string> = {
  0: 'Marco',
  1: 'Tarefa',
  2: 'Subtarefa',
};

const getLevelLabel = (depth: number): string => {
  if (depth === 0) return 'Marco';
  if (depth === 1) return 'Tarefa';
  return 'Subtarefa';
};

export function ProjectHierarchyCard({
  task,
  allTasks,
  depth = 0,
  onToggleExpand,
  onToggleComplete,
  onEdit,
  onAddSubtask,
  expandedTasks,
  filter,
}: ProjectHierarchyCardProps) {
  const [showAddButton, setShowAddButton] = useState(false);
  
  // Get direct children
  const children = allTasks.filter(t => t.parentId === task.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedTasks.includes(task.id);
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';

  // Calculate completion stats
  const completedChildren = children.filter(c => c.status === 'completed').length;

  // Filter logic - show task if it matches filter, or if it has descendants that match
  const matchesFilter = filter === 'all' || 
    (filter === 'completed' && isCompleted) ||
    (filter === 'pending' && !isCompleted);

  // Check if any descendant matches filter
  const hasMatchingDescendant = (taskId: string): boolean => {
    const taskChildren = allTasks.filter(t => t.parentId === taskId);
    return taskChildren.some(child => {
      const childMatches = filter === 'all' ||
        (filter === 'completed' && child.status === 'completed') ||
        (filter === 'pending' && child.status !== 'completed');
      return childMatches || hasMatchingDescendant(child.id);
    });
  };

  const shouldShow = matchesFilter || hasMatchingDescendant(task.id);
  if (!shouldShow) return null;

  // Get indentation and styling based on depth
  const getDepthStyles = () => {
    if (depth === 0) {
      return {
        marginLeft: 0,
        fontSize: 'text-base',
        fontWeight: 'font-semibold',
        showIcon: true,
      };
    } else if (depth === 1) {
      return {
        marginLeft: 24,
        fontSize: 'text-sm',
        fontWeight: 'font-medium',
        showIcon: false,
      };
    } else if (depth === 2) {
      return {
        marginLeft: 48,
        fontSize: 'text-sm',
        fontWeight: 'font-normal',
        showIcon: false,
      };
    } else {
      return {
        marginLeft: Math.min(72, 24 + depth * 24),
        fontSize: 'text-sm',
        fontWeight: 'font-normal',
        showIcon: false,
      };
    }
  };

  const styles = getDepthStyles();
  const priority = priorityDots[task.priority];
  const levelLabel = getLevelLabel(depth);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(task.id);
    }
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isBlocked) {
      onToggleComplete(task.id);
    }
  };

  const handleEdit = () => {
    onEdit(task);
  };

  const handleAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubtask?.(task.id);
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        onClick={handleEdit}
        onMouseEnter={() => setShowAddButton(true)}
        onMouseLeave={() => setShowAddButton(false)}
        style={{ marginLeft: styles.marginLeft }}
        className={cn(
          'group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer',
          'bg-card border border-border/50',
          isCompleted && 'opacity-60',
          isBlocked && 'border-l-2 border-l-red-500',
          depth === 0 && 'bg-card/80 shadow-sm'
        )}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={handleToggleExpand}
          className={cn(
            'shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all',
            hasChildren 
              ? 'hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground' 
              : 'opacity-0 pointer-events-none'
          )}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </button>

        {/* Folder icon for Marco level */}
        {styles.showIcon && (
          <Folder className="h-5 w-5 text-primary shrink-0" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                styles.fontSize,
                styles.fontWeight,
                'truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            
            {/* Completion count for parents */}
            {hasChildren && (
              <span className="text-xs text-muted-foreground font-medium">
                {completedChildren}/{children.length}
              </span>
            )}
          </div>
          
          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{levelLabel}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', priority.color)} />
              <span>{priority.label}</span>
            </div>
          </div>
        </div>

        {/* Add subtask button (on hover) */}
        <AnimatePresence>
          {showAddButton && onAddSubtask && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={handleAddSubtask}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          disabled={isBlocked}
          className={cn(
            'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
            isCompleted
              ? 'bg-primary border-primary'
              : isBlocked
              ? 'border-muted-foreground/30 cursor-not-allowed bg-muted/30'
              : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
          )}
        >
          {isCompleted && (
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          )}
          {isBlocked && !isCompleted && (
            <Lock className="h-3 w-3 text-muted-foreground/50" />
          )}
        </button>
      </motion.div>

      {/* Children (nested) */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-2"
          >
            {children.map(child => (
              <ProjectHierarchyCard
                key={child.id}
                task={child}
                allTasks={allTasks}
                depth={depth + 1}
                onToggleExpand={onToggleExpand}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onAddSubtask={onAddSubtask}
                expandedTasks={expandedTasks}
                filter={filter}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
