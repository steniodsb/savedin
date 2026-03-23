import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableTaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  type: 'task' | 'habit' | 'milestone';
  onClick?: () => void;
  disabled?: boolean;
}

export function DraggableTaskItem({ 
  id, 
  title, 
  completed, 
  type, 
  onClick,
  disabled = false 
}: DraggableTaskItemProps) {
  const isDraggable = type === 'task' && !disabled;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${id}`,
    disabled: !isDraggable,
    data: {
      type: 'task',
      taskId: id,
      title,
    },
  });

  const getItemColor = () => {
    switch (type) {
      case 'habit': return { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', dot: '#10b981' };
      case 'task': return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', dot: '#3b82f6' };
      case 'milestone': return { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', dot: '#a855f7' };
      default: return { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af', dot: '#9ca3af' };
    }
  };

  const colors = getItemColor();

  const combinedStyle = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 1000 : undefined,
    backgroundColor: completed ? 'hsl(var(--muted)/0.3)' : colors.bg,
    borderLeft: `2px solid ${colors.border}`,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={combinedStyle}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isDragging ? 0.8 : 1, 
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : 'none'
      }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 p-1.5 rounded-lg transition-all text-xs group",
        "hover:bg-card/70",
        completed && "opacity-50",
        isDragging && "ring-2 ring-primary/50 bg-card/90",
        isDraggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Drag Handle - only for tasks */}
      {isDraggable && (
        <div 
          {...attributes} 
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      )}

      {/* Completion Indicator */}
      <div 
        className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          backgroundColor: completed ? colors.dot : 'transparent',
          border: !completed ? `1px solid ${colors.dot}` : 'none'
        }}
      >
        {completed && <Check className="w-2 h-2 text-white" />}
      </div>

      {/* Title */}
      <span className={cn(
        "truncate flex-1",
        completed && "line-through text-muted-foreground"
      )}>
        {title}
      </span>

      {/* Type indicator for non-draggable items */}
      {!isDraggable && type === 'habit' && (
        <span className="text-[10px] text-muted-foreground/50">🔒</span>
      )}
    </motion.div>
  );
}
