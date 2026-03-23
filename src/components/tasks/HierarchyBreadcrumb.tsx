import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface HierarchyBreadcrumbProps {
  className?: string;
}

export function HierarchyBreadcrumb({ className }: HierarchyBreadcrumbProps) {
  const { tasks, breadcrumbPath, setCurrentParentId, setBreadcrumbPath } = useStore();

  const handleNavigate = (taskId: string | null, index: number) => {
    setCurrentParentId(taskId);
    if (taskId === null) {
      setBreadcrumbPath([]);
    } else {
      setBreadcrumbPath(breadcrumbPath.slice(0, index + 1));
    }
  };

  const breadcrumbTasks = breadcrumbPath.map(id => tasks.find(t => t.id === id)).filter(Boolean);

  if (breadcrumbPath.length === 0) {
    return null;
  }

  return (
    <nav className={cn('flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide py-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => handleNavigate(null, -1)}
      >
        <Home className="h-4 w-4" />
      </Button>
      
      {breadcrumbTasks.map((task, index) => (
        <div key={task!.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 max-w-[150px] truncate',
              index === breadcrumbTasks.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => handleNavigate(task!.id, index)}
          >
            {task!.title}
          </Button>
        </div>
      ))}
    </nav>
  );
}
