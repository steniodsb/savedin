import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 rounded-2xl p-3 flex flex-col h-full transition-all duration-200 border",
        "bg-card/50 backdrop-blur-md border-border/10",
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground ml-auto bg-background px-2 py-0.5 rounded-full border border-border">{count}</span>
      </div>
      <div className="overflow-y-auto flex-1 min-h-[100px] space-y-2">
        {children}
      </div>
    </div>
  );
}
