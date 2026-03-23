import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DroppableDayProps {
  id: string;
  dateStr: string;
  isToday?: boolean;
  isOver?: boolean;
  children: ReactNode;
  className?: string;
}

export function DroppableDay({ 
  id, 
  dateStr, 
  isToday = false, 
  children, 
  className 
}: DroppableDayProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'day',
      dateStr,
    },
  });

  const isActiveDropTarget = isOver && active?.data?.current?.type === 'task';

  return (
    <motion.div
      ref={setNodeRef}
      animate={{
        scale: isActiveDropTarget ? 1.02 : 1,
        borderColor: isActiveDropTarget ? 'hsl(var(--primary))' : undefined,
      }}
      transition={{ duration: 0.15 }}
      className={cn(
        className,
        isActiveDropTarget && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {children}
    </motion.div>
  );
}
