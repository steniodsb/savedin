import { useState } from 'react';
import { Share2, User, Users, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConnectionsData } from '@/hooks/useConnectionsData';
import { useSharedItemsData } from '@/hooks/useSharedItemsData';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  itemId: string;
  itemType: 'task' | 'goal' | 'project';
  itemTitle: string;
  childrenIds?: string[];
  trigger?: React.ReactNode;
}

export function ShareDialog({
  itemId,
  itemType,
  itemTitle,
  childrenIds = [],
  trigger,
}: ShareDialogProps) {
  const { user } = useAuth();
  const { acceptedConnections } = useConnectionsData();
  const { shareItem, sharedItems, removeShare } = useSharedItemsData();
  
  const [open, setOpen] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  // Get current shares for this item
  const currentShares = sharedItems.filter(
    s => s.itemId === itemId && s.ownerId === user?.id
  );

  const handleShare = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await shareItem({
        itemId,
        itemType,
        sharedWithId: userId,
        permission: 'edit',
        childrenIds,
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRemoveShare = async (shareId: string, userId: string) => {
    setLoadingUserId(userId);
    try {
      await removeShare(shareId);
    } finally {
      setLoadingUserId(null);
    }
  };

  const getConnectionUser = (connection: typeof acceptedConnections[0]) => {
    const isRequester = connection.requesterId === user?.id;
    return {
      id: isRequester ? connection.addresseeId : connection.requesterId,
      name: isRequester 
        ? (connection.addresseeName || connection.addresseeUsername)
        : (connection.requesterName || connection.requesterUsername),
      username: isRequester ? connection.addresseeUsername : connection.requesterUsername,
      avatar: isRequester ? connection.addresseeAvatar : connection.requesterAvatar,
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Compartilhar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Compartilhando: <span className="font-medium text-foreground">{itemTitle}</span>
            </p>
            {childrenIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                + {childrenIds.length} sub-item(s) incluído(s)
              </p>
            )}
          </div>

          {acceptedConnections.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma conexão disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Conecte-se com outros usuários nas Configurações
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Selecione um usuário
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {acceptedConnections.map((connection) => {
                  const connUser = getConnectionUser(connection);
                  const existingShare = currentShares.find(
                    s => s.sharedWithId === connUser.id
                  );
                  const isShared = !!existingShare;
                  const isLoading = loadingUserId === connUser.id;

                  return (
                    <button
                      key={connection.id}
                      onClick={() => {
                        if (isShared && existingShare) {
                          handleRemoveShare(existingShare.id, connUser.id);
                        } else {
                          handleShare(connUser.id);
                        }
                      }}
                      disabled={isLoading}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                        isShared
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {connUser.avatar ? (
                          <img src={connUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-foreground truncate">{connUser.name}</p>
                        <p className="text-sm text-muted-foreground">@{connUser.username}</p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : isShared ? (
                        <div className="flex items-center gap-1 text-primary">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">
                            {existingShare?.status === 'pending' ? 'Pendente' : 'Compartilhado'}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
