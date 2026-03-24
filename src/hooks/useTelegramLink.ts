import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface TelegramLink {
  id: string;
  user_id: string;
  chat_id: number | null;
  username: string | null;
  first_name: string | null;
  link_code: string | null;
  linked_at: string;
  is_active: boolean;
}

export function useTelegramLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: telegramLink, isLoading } = useQuery({
    queryKey: ['savedin-telegram-link', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await savedinClient
        .from('telegram_links')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) { console.warn('savedin.telegram_links:', error.message); return null; }
      return data as TelegramLink | null;
    },
    enabled: !!user?.id,
    retry: false,
  });

  const isConnected = !!telegramLink?.chat_id;

  const generateLinkCode = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Generate random code
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(36).toUpperCase())
        .join('')
        .slice(0, 8);

      // Delete any existing unused codes for this user
      await savedinClient
        .from('telegram_links')
        .delete()
        .eq('user_id', user.id)
        .is('chat_id', null);

      // If already connected, don't create a new code
      if (telegramLink?.chat_id) {
        throw new Error('Já conectado');
      }

      const { data, error } = await savedinClient
        .from('telegram_links')
        .insert({
          user_id: user.id,
          link_code: code,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TelegramLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-telegram-link'] });
    },
    onError: (error: any) => {
      if (error.message !== 'Já conectado') {
        toast({ title: 'Erro ao gerar código', variant: 'destructive' });
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await savedinClient
        .from('telegram_links')
        .update({ is_active: false })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedin-telegram-link'] });
      toast({ title: 'Telegram desconectado' });
    },
    onError: () => {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    },
  });

  const botUsername = 'SaveDin_ChatBot';
  const deepLink = telegramLink?.link_code
    ? `https://t.me/${botUsername}?start=${telegramLink.link_code}`
    : null;

  return {
    telegramLink,
    isConnected,
    isLoading,
    deepLink,
    botUsername,
    generateLinkCode: generateLinkCode.mutateAsync,
    disconnect: disconnect.mutateAsync,
  };
}
