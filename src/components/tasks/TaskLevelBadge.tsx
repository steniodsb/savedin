import { TaskLevel } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flag, CheckSquare, ListChecks } from 'lucide-react';

interface TaskLevelBadgeProps {
  level: TaskLevel;
  className?: string;
}

const levelConfig: Record<TaskLevel, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  milestone: {
    label: 'Marco',
    icon: Flag,
    className: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  task: {
    label: 'Tarefa',
    icon: CheckSquare,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  subtask: {
    label: 'Subtarefa',
    icon: ListChecks,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
};

export function TaskLevelBadge({ level, className }: TaskLevelBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1.5 py-0 h-5 font-medium border gap-1',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
