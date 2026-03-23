import { useState } from 'react';
import { Inbox, Check, X, Target, CheckSquare, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSharedItemsData } from '@/hooks/useSharedItemsData';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PendingSharesInboxProps {
  trigger?: React.ReactNode;
}

export function PendingSharesInbox({ trigger }: PendingSharesInboxProps) {
  const {
    pendingTasks,
    pendingGoals,
    acceptSharedItem,
    rejectSharedItem,
  } = useSharedItemsData();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const totalPending = pendingTasks.length + pendingGoals.length;

  const handleAccept = async (id: string) => {
    setLoadingId(id);
    try {
      await acceptSharedItem(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    try {
      await rejectSharedItem(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="relative">
            <Inbox className="w-5 h-5" />
            {totalPending > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                variant="destructive"
              >
                {totalPending}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            Compartilhados comigo
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {totalPending === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum item pendente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Quando alguém compartilhar algo com você, aparecerá aqui
              </p>
            </div>
          ) : (
            <>
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Tarefas ({pendingTasks.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingTasks.map((share) => (
                      <div
                        key={share.id}
                        className="p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {share.ownerAvatar ? (
                              <img src={share.ownerAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                @{share.ownerUsername}
                              </span>{' '}
                              compartilhou uma tarefa com você
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(share.id)}
                                disabled={loadingId === share.id}
                              >
                                {loadingId === share.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Recusar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAccept(share.id)}
                                disabled={loadingId === share.id}
                              >
                                {loadingId === share.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Aceitar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Goals */}
              {pendingGoals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Metas ({pendingGoals.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingGoals.map((share) => (
                      <div
                        key={share.id}
                        className="p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {share.ownerAvatar ? (
                              <img src={share.ownerAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                @{share.ownerUsername}
                              </span>{' '}
                              compartilhou uma meta com você
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(share.id)}
                                disabled={loadingId === share.id}
                              >
                                {loadingId === share.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Recusar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAccept(share.id)}
                                disabled={loadingId === share.id}
                              >
                                {loadingId === share.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Aceitar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
