import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Extend ServiceWorkerRegistration to include pushManager (Push API)
declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }
}

// VAPID Public Key for push notifications
// This key MUST match the VAPID_PUBLIC_KEY secret in Supabase
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BPaQC1pX5rTsQpSJcWH6E3iFzmN4kMFq-jgtEAiNBdLyg6cabXXaz6t9a4S_tS4rkfcMKpTYW95DXQ4dH5m7MM0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationPreferences {
  overdueTasks: boolean;
  upcomingDeadlines: boolean;
  habitReminders: boolean;
  goalProgress: boolean;
  frequency: NotificationFrequency;
  timezone: string;
  morningNotificationTime: string; // HH:MM format
  eveningNotificationTime: string; // HH:MM format
  bedtimeHour: string; // HH:MM format - used for habit evening reminders (2h before)
}

// Get user's browser timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Sao_Paulo';
  }
};

const defaultPreferences: NotificationPreferences = {
  overdueTasks: true,
  upcomingDeadlines: true,
  habitReminders: true,
  goalProgress: true,
  frequency: 'immediate',
  timezone: getBrowserTimezone(),
  morningNotificationTime: '08:00',
  eveningNotificationTime: '18:00',
  bedtimeHour: '22:00', // Default bedtime for habit evening reminders
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from database
  const loadPreferencesFromDB = useCallback(async () => {
    if (!user) {
      setIsLoadingPreferences(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.notification_preferences) {
        const dbPrefs = data.notification_preferences as unknown as NotificationPreferences;
        setPreferences({ ...defaultPreferences, ...dbPrefs });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [user]);

  // Save preferences to database
  const savePreferencesToDB = useCallback(async (prefs: NotificationPreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: JSON.parse(JSON.stringify(prefs)) })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      throw error;
    }
  }, [user]);

  // Public save function that can be called from components
  const savePreferences = useCallback(async (prefs: NotificationPreferences) => {
    await savePreferencesToDB(prefs);
    setPreferences(prefs);
  }, [savePreferencesToDB]);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 
                      'PushManager' in window && 
                      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }

    loadPreferencesFromDB();
  }, [user, loadPreferencesFromDB]);

  const checkSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [user]);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    }
    throw new Error('Service Worker not supported');
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const subscribe = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para ativar notificações');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error('Notificações push não estão configuradas');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if needed
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast.error('Permissão para notificações negada');
          return false;
        }
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Notificações ativadas!');
      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Browser notifications (when app is open)
  const showBrowserNotification = (title: string, body: string, url?: string) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });

    notification.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notification.close();
    };
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K, 
    value: NotificationPreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    // Debounce save to database
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePreferencesToDB(newPrefs);
    }, 500);
  };

  // Test notification function - send via edge function
  const sendTestNotification = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    // First check if we have a valid subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        toast.error('Nenhuma inscrição push encontrada. Tente desativar e reativar as notificações.');
        console.log('No push subscription found');
        return;
      }
      
      console.log('Current subscription endpoint:', subscription.endpoint.substring(0, 50) + '...');
    } catch (swError) {
      console.error('Service worker error:', swError);
      toast.error('Erro ao verificar Service Worker');
      return;
    }

    try {
      console.log('Sending test notification for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🔔 Teste de Notificação',
          body: 'Se você viu isso, as notificações estão funcionando!',
          url: '/',
        },
      });

      if (error) {
        console.error('Error sending test:', error);
        toast.error(`Erro: ${error.message}`);
        return;
      }

      console.log('Test notification response:', data);
      
      if (data?.sent > 0) {
        toast.success(`Notificação enviada! (${data.sent} dispositivo(s))`);
      } else if (data?.failed > 0) {
        toast.warning(`Falha ao enviar para ${data.failed} dispositivo(s). Tente reativar as notificações.`);
      } else {
        toast.info('Nenhum dispositivo registrado. Tente reativar as notificações.');
      }
    } catch (err) {
      console.error('Test notification error:', err);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    preferences,
    subscribe,
    unsubscribe,
    requestPermission,
    showBrowserNotification,
    checkSubscription,
    updatePreference,
    savePreferences,
    sendTestNotification,
  };
}