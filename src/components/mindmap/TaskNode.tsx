import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Icon3D } from '@/components/ui/icon-picker';

interface TaskNodeData {
  task: {
    id: string;
    title: string;
    icon?: string;
    status: string;
    priority: string;
  };
  isSubtask?: boolean;
  orphan?: boolean;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onAddSubtask?: (taskId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onToggleCollapse?: (taskId: string) => void;
  onToggleComplete?: (taskId: string) => void;
}

export const TaskNode = memo(({ data }: NodeProps<TaskNodeData>) => {
  const { task, hasChildren, isCollapsed, onAddSubtask, onTaskClick, onToggleCollapse, onToggleComplete } = data;

  const isCompleted = task.status === 'completed';

  const handleNodeClick = (e: React.MouseEvent) => {
    // Only open details, collapse is handled by the chevron button
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggleCollapse) {
      onToggleCollapse(task.id);
    }
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleComplete) {
      onToggleComplete(task.id);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddSubtask) {
      onAddSubtask(task.id);
    }
  };

  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all duration-200",
        "min-w-[160px] max-w-[200px]",
        isCompleted && "opacity-50 grayscale"
      )}
      onClick={handleNodeClick}
    >
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !bg-muted-foreground/30 !border-2 !border-background hover:!bg-primary transition-colors"
      />

      {/* Card content - clean minimal style like dash */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          {/* Collapse indicator - clickable button */}
          {hasChildren && (
            <button
              onClick={handleCollapseClick}
              className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Icon */}
          {task.icon && task.icon !== 'none' && (
            <div className="shrink-0" onClick={handleDetailClick}>
              <Icon3D icon={task.icon} size="sm" fallback="" />
            </div>
          )}

          {/* Title */}
          <p 
            className={cn(
              "flex-1 font-medium text-sm text-foreground truncate",
              isCompleted && "line-through"
            )}
            onClick={handleDetailClick}
          >
            {task.title}
          </p>

          {/* Check button */}
          <button
            onClick={handleCheckClick}
            className={cn(
              "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              isCompleted 
                ? "bg-green-500 border-green-500 text-white" 
                : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
            )}
          >
            {isCompleted && <Check className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Add subtask button */}
      {onAddSubtask && !isCollapsed && (
        <button
          onClick={handleAddClick}
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-muted/80 border border-border text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-muted hover:text-foreground hover:scale-110"
          title="Adicionar subtarefa"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !bg-muted-foreground/30 !border-2 !border-background hover:!bg-primary transition-colors"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
