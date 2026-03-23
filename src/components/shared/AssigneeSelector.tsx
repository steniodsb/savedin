import { useState } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import { useConnectionsData } from '@/hooks/useConnectionsData';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AssigneeSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export function AssigneeSelector({
  selectedIds,
  onSelectionChange,
  className,
}: AssigneeSelectorProps) {
  const { user } = useAuth();
  const { acceptedConnections } = useConnectionsData();
  const [open, setOpen] = useState(false);

  // Build list of connected friends
  const friends = acceptedConnections.map((conn) => {
    const isRequester = conn.requesterId === user?.id;
    return {
      id: isRequester ? conn.addresseeId : conn.requesterId,
      username: isRequester ? conn.addresseeUsername : conn.requesterUsername,
      name: isRequester ? conn.addresseeName : conn.requesterName,
      avatar: isRequester ? conn.addresseeAvatar : conn.requesterAvatar,
    };
  });

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectedFriends = friends.filter((f) => selectedIds.includes(f.id));

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected avatars */}
      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFriends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-1.5 bg-accent rounded-full pl-1 pr-2 py-1"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={friend.avatar || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(friend.name?.[0] || friend.username?.[0] || '?').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">
                {friend.name || friend.username}
              </span>
              <button
                type="button"
                onClick={() => toggleSelection(friend.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            {selectedIds.length > 0 ? 'Editar responsáveis' : 'Adicionar responsáveis'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          {friends.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum amigo conectado.
              <br />
              Adicione conexões em Amigos.
            </div>
          ) : (
            <ScrollArea className="max-h-60">
              <div className="p-2 space-y-1">
                {friends.map((friend) => {
                  const isSelected = selectedIds.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleSelection(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-accent'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar || undefined} />
                        <AvatarFallback>
                          {(friend.name?.[0] || friend.username?.[0] || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {friend.name || friend.username}
                        </p>
                        {friend.name && friend.username && (
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
