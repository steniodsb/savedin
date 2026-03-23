import { useState } from 'react';
import { Search, UserPlus, Users, Check, X, Loader2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConnectionsData, UserProfile } from '@/hooks/useConnectionsData';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Helper para gerar iniciais do nome
const getInitials = (name?: string | null, username?: string | null): string => {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return '??';
};

export function ConnectionsManager() {
  const { user } = useAuth();
  const {
    pendingReceived,
    pendingSent,
    acceptedConnections,
    isLoading,
    searchUserByUsername,
    sendConnectionRequest,
    acceptConnection,
    rejectConnection,
    removeConnection,
  } = useConnectionsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchError('Digite pelo menos 3 caracteres');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await searchUserByUsername(searchQuery.replace('@', ''));
      if (result) {
        // Check if already connected or pending
        const isConnected = acceptedConnections.some(
          c => c.requesterId === result.userId || c.addresseeId === result.userId
        );
        const isPending = [...pendingReceived, ...pendingSent].some(
          c => c.requesterId === result.userId || c.addresseeId === result.userId
        );

        if (isConnected) {
          setSearchError('Vocês já estão conectados');
        } else if (isPending) {
          setSearchError('Já existe uma solicitação pendente');
        } else {
          setSearchResult(result);
        }
      } else {
        setSearchError('Usuário não encontrado');
      }
    } catch {
      setSearchError('Erro ao buscar usuário');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setActionLoading(userId);
    try {
      await sendConnectionRequest(userId);
      setSearchResult(null);
      setSearchQuery('');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await acceptConnection(connectionId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await rejectConnection(connectionId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await removeConnection(connectionId);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <span className="font-medium">Adicionar conexão</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError(null);
                setSearchResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="@nome_de_usuario"
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Buscar'
            )}
          </Button>
        </div>

        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}

        {searchResult && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
            <Avatar className="w-12 h-12">
              <AvatarImage src={searchResult.avatarUrl || undefined} alt={searchResult.fullName || searchResult.username} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {getInitials(searchResult.fullName, searchResult.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary font-medium">@{searchResult.username}</p>
              <p className="text-base font-semibold text-foreground truncate">
                {searchResult.fullName || searchResult.username}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleSendRequest(searchResult.userId)}
              disabled={actionLoading === searchResult.userId}
            >
              {actionLoading === searchResult.userId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Conectar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Pending Received Requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">
              Solicitações recebidas ({pendingReceived.length})
            </span>
          </div>
          <div className="bg-card rounded-xl shadow-md divide-y divide-border">
            {pendingReceived.map((connection) => (
              <div key={connection.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={connection.requesterAvatar || undefined} alt={connection.requesterName || connection.requesterUsername} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {getInitials(connection.requesterName, connection.requesterUsername)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary font-medium">
                      @{connection.requesterUsername || 'usuario'}
                    </p>
                    <p className="text-base font-semibold text-foreground truncate">
                      {connection.requesterName || connection.requesterUsername || 'Usuário'}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(connection.id)}
                        disabled={actionLoading === connection.id}
                        className="flex-1"
                      >
                        {actionLoading === connection.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Aceitar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(connection.id)}
                        disabled={actionLoading === connection.id}
                        className="flex-1"
                      >
                        {actionLoading === connection.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Recusar
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

      {/* Pending Sent Requests */}
      {pendingSent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Enviadas ({pendingSent.length})
            </span>
          </div>
          <div className="bg-card rounded-xl shadow-md divide-y divide-border">
            {pendingSent.map((connection) => (
              <div key={connection.id} className="flex items-center gap-3 p-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={connection.addresseeAvatar || undefined} alt={connection.addresseeName || connection.addresseeUsername} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {getInitials(connection.addresseeName, connection.addresseeUsername)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary font-medium">@{connection.addresseeUsername}</p>
                  <p className="text-base font-semibold text-foreground truncate">
                    {connection.addresseeName || connection.addresseeUsername}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  Pendente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Connections */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            Conexões ({acceptedConnections.length})
          </span>
        </div>
        {acceptedConnections.length === 0 ? (
          <div className="bg-card rounded-xl shadow-md p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma conexão ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Busque usuários pelo nome de usuário para conectar
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-md divide-y divide-border">
            {acceptedConnections.map((connection) => {
              const isRequester = connection.requesterId === user?.id;
              const avatar = isRequester ? connection.addresseeAvatar : connection.requesterAvatar;
              const name = isRequester 
                ? (connection.addresseeName || connection.addresseeUsername)
                : (connection.requesterName || connection.requesterUsername);
              const username = isRequester ? connection.addresseeUsername : connection.requesterUsername;

              const fullName = isRequester ? connection.addresseeName : connection.requesterName;

              return (
                <div key={connection.id} className="flex items-center gap-3 p-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={avatar || undefined} alt={name} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {getInitials(fullName, username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary font-medium">@{username}</p>
                    <p className="text-base font-semibold text-foreground truncate">{name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(connection.id)}
                    disabled={actionLoading === connection.id}
                  >
                    {actionLoading === connection.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
