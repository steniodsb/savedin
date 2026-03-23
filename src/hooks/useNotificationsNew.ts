import { useState, useEffect, useCallback } from 'react';
import { NotificationSystem } from '@/lib/notifications';
import { toast } from 'sonner';

export function useNotificationsNew() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Verifica suporte e permissão atual
  useEffect(() => {
    const supported = NotificationSystem.isSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(NotificationSystem.getPermissionStatus());
    }
  }, []);

  // Solicitar permissão
  const requestPermission = useCallback(async () => {
    const granted = await NotificationSystem.requestPermission();

    if (granted) {
      setPermission('granted');

      // Mostra notificação de teste
      try {
        await NotificationSystem.showTestNotification();
        toast.success('Notificações ativadas!');
      } catch (error) {
        console.error('Erro ao mostrar notificação de teste:', error);
      }
    } else {
      setPermission(NotificationSystem.getPermissionStatus());
      if (NotificationSystem.getPermissionStatus() === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      }
    }

    return granted;
  }, []);

  // Agendar lembrete de tarefa
  const scheduleTaskReminder = useCallback(
    (
      task: {
        id: string;
        title: string;
        icon?: string;
      },
      reminderTime: Date
    ): string | null => {
      if (permission !== 'granted') {
        console.warn('Permissão não concedida');
        return null;
      }

      return NotificationSystem.scheduleNotification(reminderTime, {
        title: '📋 Lembrete de Tarefa',
        body: `${task.icon || '✅'} ${task.title}`,
        tag: `task-${task.id}`,
        data: {
          type: 'task',
          taskId: task.id,
          url: '/',
        },
      });
    },
    [permission]
  );

  // Agendar lembrete de hábito
  const scheduleHabitReminder = useCallback(
    (
      habit: {
        id: string;
        title: string;
        icon?: string;
      },
      reminderTime: Date
    ): string | null => {
      if (permission !== 'granted') {
        console.warn('Permissão não concedida');
        return null;
      }

      return NotificationSystem.scheduleNotification(reminderTime, {
        title: '🔁 Hora do Hábito!',
        body: `${habit.icon || '🔁'} ${habit.title}`,
        tag: `habit-${habit.id}`,
        data: {
          type: 'habit',
          habitId: habit.id,
          url: '/',
        },
      });
    },
    [permission]
  );

  // Cancelar lembrete
  const cancelReminder = useCallback((tag: string) => {
    NotificationSystem.cancelScheduledNotification(tag);
  }, []);

  // Notificação imediata
  const showNotification = useCallback(
    async (title: string, body: string, tag?: string) => {
      if (permission !== 'granted') return;

      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body,
            icon: '/favicon.webp',
            badge: '/favicon.webp',
            tag: tag || 'general',
          } as NotificationOptions);
        } else {
          new Notification(title, { body, icon: '/favicon.webp' });
        }
      } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
      }
    },
    [permission]
  );

  // Testar notificação
  const testNotification = useCallback(async () => {
    if (permission !== 'granted') {
      toast.error('Ative as notificações primeiro');
      return;
    }

    try {
      await NotificationSystem.showTestNotification();
      toast.success('Notificação de teste enviada!');
    } catch (error) {
      toast.error('Erro ao enviar notificação de teste');
    }
  }, [permission]);

  return {
    // Estado
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',

    // Ações
    requestPermission,
    scheduleTaskReminder,
    scheduleHabitReminder,
    cancelReminder,
    showNotification,
    testNotification,
  };
}
