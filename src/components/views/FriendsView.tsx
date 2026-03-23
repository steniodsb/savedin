import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Share2, Check, X, Target, CheckSquare, User, Loader2, Inbox } from 'lucide-react';
import { ConnectionsManager } from '@/components/settings/ConnectionsManager';
import { useSharedItemsData } from '@/hooks/useSharedItemsData';
import { Button } from '@/components/ui/button';


export function FriendsView() {
  const {
    pendingTasks,
    pendingGoals,
    acceptSharedItem,
    rejectSharedItem,
  } = useSharedItemsData();

  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-4 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky sticky-safe-top z-40 backdrop-blur-sm border-b border-border/10 py-5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Amigos</h1>
          </div>
        </div>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-4 space-y-6"
      >
        {/* Shares Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Compartilhamentos
            {totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {totalPending}
              </span>
            )}
          </h2>
            <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-border/10">
            {totalPending === 0 ? (
              <div className="text-center py-8">
                <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum compartilhamento pendente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando alguém compartilhar tarefas ou metas com você, aparecerá aqui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                          className="p-3 bg-muted/30 backdrop-blur-sm rounded-lg border border-border/10"
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
                          className="p-3 bg-muted/30 backdrop-blur-sm rounded-lg border border-border/10"
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
              </div>
            )}
          </div>
        </motion.section>

        {/* Connections Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Conexões
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-border/10">
            <ConnectionsManager />
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
