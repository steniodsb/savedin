import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { Environment } from '@/types/savedin';

interface EnvironmentBadgeProps {
  environmentId: string | null | undefined;
  environments?: Environment[];
  className?: string;
}

export function EnvironmentBadge({ environmentId, environments: envsProp, className = '' }: EnvironmentBadgeProps) {
  const { environments: envsHook } = useEnvironmentsData();
  const environments = envsProp || envsHook;

  if (!environmentId) return null;
  if (!environments || environments.length === 0) return null;

  const env = environments.find(e => e.id === environmentId);
  if (!env) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50 ${className}`}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: env.color }}
      />
      <span className="truncate max-w-[80px]">{env.name}</span>
    </span>
  );
}
