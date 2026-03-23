import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProfilesByIds } from '@/hooks/useProfilesByIds';

interface AssigneesAvatarsProps {
  assigneeIds: string[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AssigneesAvatars({
  assigneeIds,
  maxVisible = 3,
  size = 'sm',
  className,
}: AssigneesAvatarsProps) {
  const { profiles, isLoading } = useProfilesByIds(assigneeIds);

  if (!assigneeIds || assigneeIds.length === 0) return null;

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const visibleProfiles = profiles.slice(0, maxVisible);
  const remaining = profiles.length - maxVisible;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center -space-x-1.5', className)}>
            {visibleProfiles.map((profile, index) => (
              <div
                key={profile.userId}
                className={cn(
                  'rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-background ring-0',
                  sizeClasses[size]
                )}
                style={{ zIndex: maxVisible - index }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName || profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className={cn(iconSizes[size], 'text-primary')} />
                )}
              </div>
            ))}
            {remaining > 0 && (
              <div
                className={cn(
                  'rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background',
                  sizeClasses[size]
                )}
              >
                +{remaining}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {profiles.map(p => p.fullName || p.username).join(', ')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
