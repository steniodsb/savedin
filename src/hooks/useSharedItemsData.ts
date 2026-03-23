import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface SharedItem {
  id: string;
  itemId: string;
  itemType: 'task' | 'goal' | 'project';
  ownerId: string;
  sharedWithId: string;
  status: 'pending' | 'accepted' | 'rejected';
  permission: 'view' | 'edit';
  createdAt: string;
  // Joined profile data
  ownerUsername?: string;
  ownerName?: string;
  ownerAvatar?: string;
  sharedWithUsername?: string;
  sharedWithName?: string;
  sharedWithAvatar?: string;
}

interface SharedItemRow {
  id: string;
  item_id: string;
  item_type: string;
  owner_id: string;
  shared_with_id: string;
  status: string;
  permission: string;
  created_at: string;
}

export function useSharedItemsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all shared items for current user
  const { data: sharedItems = [], isLoading, error } = useQuery({
    queryKey: ['shared_items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('shared_items')
        .select('*')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique user IDs to fetch profiles
      const userIds = new Set<string>();
      (data || []).forEach((row: SharedItemRow) => {
        userIds.add(row.owner_id);
        userIds.add(row.shared_with_id);
      });

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map((row: SharedItemRow): SharedItem => {
        const ownerProfile = profileMap.get(row.owner_id);
        const sharedWithProfile = profileMap.get(row.shared_with_id);

        return {
          id: row.id,
          itemId: row.item_id,
          itemType: row.item_type as 'task' | 'goal' | 'project',
          ownerId: row.owner_id,
          sharedWithId: row.shared_with_id,
          status: row.status as SharedItem['status'],
          permission: row.permission as SharedItem['permission'],
          createdAt: row.created_at,
          ownerUsername: ownerProfile?.username,
          ownerName: ownerProfile?.full_name,
          ownerAvatar: ownerProfile?.avatar_url,
          sharedWithUsername: sharedWithProfile?.username,
          sharedWithName: sharedWithProfile?.full_name,
          sharedWithAvatar: sharedWithProfile?.avatar_url,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Share an item (task or goal) with a connected user
  const shareItem = useMutation({
    mutationFn: async ({
      itemId,
      itemType,
      sharedWithId,
      permission = 'edit',
      childrenIds = [],
    }: {
      itemId: string;
      itemType: 'task' | 'goal' | 'project';
      sharedWithId: string;
      permission?: 'view' | 'edit';
      childrenIds?: string[];
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Collect all item IDs to share (main + children)
      const allItemIds = [itemId, ...childrenIds];
      
      // Check which items are already shared with this user
      const { data: existingShares } = await supabase
        .from('shared_items')
        .select('item_id')
        .eq('item_type', itemType)
        .eq('shared_with_id', sharedWithId)
        .in('item_id', allItemIds);
      
      const alreadySharedIds = new Set((existingShares || []).map(s => s.item_id));
      
      // Filter out already shared items
      const itemsToInsert = allItemIds
        .filter(id => !alreadySharedIds.has(id))
        .map(id => ({
          item_id: id,
          item_type: itemType,
          owner_id: user.id,
          shared_with_id: sharedWithId,
          permission,
          status: 'pending',
        }));

      if (itemsToInsert.length === 0) {
        // All items already shared, just return existing
        return existingShares;
      }

      const { data, error } = await supabase
        .from('shared_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      // Send push notification for the main item share
      if (data && data.length > 0) {
        try {
          await supabase.functions.invoke('notify-share', {
            body: {
              type: 'INSERT',
              table: 'shared_items',
              record: data[0], // Send main item for notification
            },
          });
        } catch (notifyError) {
          // Don't fail the share if notification fails
          console.error('Failed to send share notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_items'] });
      toast({
        title: 'Compartilhado com sucesso',
        description: 'Aguardando aceitação do usuário',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao compartilhar',
        variant: 'destructive',
      });
    },
  });

  // Accept a shared item
  const acceptSharedItem = useMutation({
    mutationFn: async (sharedItemId: string) => {
      const { error } = await supabase
        .from('shared_items')
        .update({ status: 'accepted' })
        .eq('id', sharedItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_items'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Item aceito',
        description: 'Agora você pode visualizar e editar este item',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao aceitar item',
        variant: 'destructive',
      });
    },
  });

  // Reject a shared item
  const rejectSharedItem = useMutation({
    mutationFn: async (sharedItemId: string) => {
      const { error } = await supabase
        .from('shared_items')
        .update({ status: 'rejected' })
        .eq('id', sharedItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_items'] });
      toast({
        title: 'Item recusado',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao recusar item',
        variant: 'destructive',
      });
    },
  });

  // Remove a share (owner only)
  const removeShare = useMutation({
    mutationFn: async (sharedItemId: string) => {
      const { error } = await supabase
        .from('shared_items')
        .delete()
        .eq('id', sharedItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_items'] });
      toast({
        title: 'Compartilhamento removido',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao remover compartilhamento',
        variant: 'destructive',
      });
    },
  });

  // Derived data
  const pendingReceived = sharedItems.filter(
    s => s.status === 'pending' && s.sharedWithId === user?.id
  );

  const pendingTasks = pendingReceived.filter(s => s.itemType === 'task');
  const pendingGoals = pendingReceived.filter(s => s.itemType === 'goal');

  const acceptedShares = sharedItems.filter(s => s.status === 'accepted');
  
  const sharedWithMe = acceptedShares.filter(s => s.sharedWithId === user?.id);
  const sharedByMe = acceptedShares.filter(s => s.ownerId === user?.id);

  // Get item IDs that are shared with me (for including in queries)
  const sharedTaskIds = sharedWithMe
    .filter(s => s.itemType === 'task')
    .map(s => s.itemId);

  const sharedGoalIds = sharedWithMe
    .filter(s => s.itemType === 'goal')
    .map(s => s.itemId);

  const sharedProjectIds = sharedWithMe
    .filter(s => s.itemType === 'project')
    .map(s => s.itemId);

  const pendingProjects = pendingReceived.filter(s => s.itemType === 'project');

  // Check if an item is shared
  const isItemShared = (itemId: string): boolean => {
    return sharedItems.some(s => s.itemId === itemId && s.status === 'accepted');
  };

  // Get collaborators for an item
  const getItemCollaborators = (itemId: string) => {
    return sharedItems
      .filter(s => s.itemId === itemId && s.status === 'accepted')
      .map(s => ({
        userId: s.sharedWithId,
        username: s.sharedWithUsername,
        name: s.sharedWithName,
        avatar: s.sharedWithAvatar,
      }));
  };

  return {
    sharedItems,
    pendingReceived,
    pendingTasks,
    pendingGoals,
    pendingProjects,
    acceptedShares,
    sharedWithMe,
    sharedByMe,
    sharedTaskIds,
    sharedGoalIds,
    sharedProjectIds,
    isLoading,
    error,
    shareItem: shareItem.mutateAsync,
    acceptSharedItem: acceptSharedItem.mutateAsync,
    rejectSharedItem: rejectSharedItem.mutateAsync,
    removeShare: removeShare.mutateAsync,
    isItemShared,
    getItemCollaborators,
  };
}
