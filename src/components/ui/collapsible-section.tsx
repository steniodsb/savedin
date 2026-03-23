import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  rightContent?: ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleSection({
  id,
  title,
  icon,
  badge,
  rightContent,
  isCollapsed,
  onToggle,
  children,
  className,
  headerClassName,
}: CollapsibleSectionProps) {
  return (
    <div className={className}>
      {/* Header - always visible */}
      <div className={cn("flex items-center justify-between mb-3", headerClassName)}>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
        >
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge}
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-1"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
        {rightContent}
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key={`content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
