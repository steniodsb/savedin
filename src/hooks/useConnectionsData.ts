import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface UserConnection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: string;
  updatedAt: string;
  // Joined profile data
  requesterUsername?: string;
  requesterName?: string;
  requesterAvatar?: string;
  addresseeUsername?: string;
  addresseeName?: string;
  addresseeAvatar?: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface ConnectionRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useConnectionsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all connections for current user
  const { data: connections = [], isLoading, error } = useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique user IDs to fetch profiles
      const userIds = new Set<string>();
      (data || []).forEach((row: ConnectionRow) => {
        userIds.add(row.requester_id);
        userIds.add(row.addressee_id);
      });

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map((row: ConnectionRow): UserConnection => {
        const requesterProfile = profileMap.get(row.requester_id);
        const addresseeProfile = profileMap.get(row.addressee_id);

        return {
          id: row.id,
          requesterId: row.requester_id,
          addresseeId: row.addressee_id,
          status: row.status as UserConnection['status'],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          requesterUsername: requesterProfile?.username,
          requesterName: requesterProfile?.full_name,
          requesterAvatar: requesterProfile?.avatar_url,
          addresseeUsername: addresseeProfile?.username,
          addresseeName: addresseeProfile?.full_name,
          addresseeAvatar: addresseeProfile?.avatar_url,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Search user by username
  const searchUserByUsername = async (username: string): Promise<UserProfile | null> => {
    if (!username || username.length < 3) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, username, full_name, avatar_url')
      .ilike('username', username)
      .neq('user_id', user?.id || '')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      username: data.username,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };
  };

  // Send connection request
  const sendConnectionRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to addressee
      try {
        await supabase.functions.invoke('notify-friend-request', {
          body: {
            requesterId: user.id,
            addresseeId,
            connectionId: data.id,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send friend request notification:', notifyError);
        // Don't fail the request if notification fails
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Solicitação enviada',
        description: 'Aguardando resposta do usuário',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message.includes('duplicate') 
          ? 'Você já enviou uma solicitação para este usuário'
          : 'Erro ao enviar solicitação',
        variant: 'destructive',
      });
    },
  });

  // Accept connection request
  const acceptConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Conexão aceita',
        description: 'Agora vocês podem compartilhar tarefas e metas',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao aceitar conexão',
        variant: 'destructive',
      });
    },
  });

  // Reject connection request
  const rejectConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Solicitação recusada',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao recusar solicitação',
        variant: 'destructive',
      });
    },
  });

  // Remove connection
  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Conexão removida',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao remover conexão',
        variant: 'destructive',
      });
    },
  });

  // Derived data
  const pendingReceived = connections.filter(
    c => c.status === 'pending' && c.addresseeId === user?.id
  );
  
  const pendingSent = connections.filter(
    c => c.status === 'pending' && c.requesterId === user?.id
  );
  
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  // Get connected user IDs for easy lookup
  const connectedUserIds = acceptedConnections.map(c =>
    c.requesterId === user?.id ? c.addresseeId : c.requesterId
  );

  return {
    connections,
    pendingReceived,
    pendingSent,
    acceptedConnections,
    connectedUserIds,
    isLoading,
    error,
    searchUserByUsername,
    sendConnectionRequest: sendConnectionRequest.mutateAsync,
    acceptConnection: acceptConnection.mutateAsync,
    rejectConnection: rejectConnection.mutateAsync,
    removeConnection: removeConnection.mutateAsync,
  };
}
