import { Users, User } from 'lucide-react';
import { useSharedItemsData } from '@/hooks/useSharedItemsData';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SharedItemsBadgeProps {
  itemId: string;
  className?: string;
  showAvatars?: boolean;
  size?: 'sm' | 'md';
}

export function SharedItemsBadge({ 
  itemId, 
  className,
  showAvatars = false,
  size = 'sm',
}: SharedItemsBadgeProps) {
  const { user } = useAuth();
  const { sharedItems } = useSharedItemsData();

  // Get all shares for this item
  const itemShares = sharedItems.filter(
    s => s.itemId === itemId && s.status === 'accepted'
  );

  if (itemShares.length === 0) return null;

  // Check if this item is shared with me (I'm not the owner)
  const isSharedWithMe = itemShares.some(s => s.sharedWithId === user?.id);
  
  // Get collaborator info
  const collaborators = itemShares.map(s => ({
    id: s.sharedWithId,
    name: s.sharedWithName || s.sharedWithUsername,
    avatar: s.sharedWithAvatar,
  }));

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const badgeSize = size === 'sm' ? 'h-5 px-1.5' : 'h-6 px-2';

  if (showAvatars && collaborators.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center -space-x-2', className)}>
              {collaborators.slice(0, 3).map((collab, index) => (
                <div
                  key={collab.id}
                  className={cn(
                    'rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-background',
                    size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
                  )}
                  style={{ zIndex: 3 - index }}
                >
                  {collab.avatar ? (
                    <img src={collab.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className={cn(iconSize, 'text-primary')} />
                  )}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div
                  className={cn(
                    'rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background',
                    size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
                  )}
                >
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Compartilhado com: {collaborators.map(c => c.name).join(', ')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full text-xs font-medium',
              badgeSize,
              isSharedWithMe
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-primary/10 text-primary',
              className
            )}
          >
            <Users className={iconSize} />
            {collaborators.length > 0 && (
              <span>{collaborators.length}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isSharedWithMe
              ? `Compartilhado por: ${itemShares[0]?.ownerName || itemShares[0]?.ownerUsername}`
              : `Compartilhado com: ${collaborators.map(c => c.name).join(', ')}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
