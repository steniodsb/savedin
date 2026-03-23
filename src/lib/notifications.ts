/**
 * Sistema de notificações para PWA
 * Funciona em Desktop e Mobile (quando PWA instalado)
 */

interface ScheduledNotification {
  scheduledTime: string;
  title: string;
  body: string;
  tag: string;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = 'savedin_scheduled_notifications';

export class NotificationSystem {
  private static timeouts: Map<string, number> = new Map();

  /**
   * Verifica se o navegador suporta notificações
   */
  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Retorna o status atual da permissão
   */
  static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Solicita permissão para mostrar notificações
   * Retorna true se concedido, false caso contrário
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('❌ Navegador não suporta notificações');
      return false;
    }

    // Se já tem permissão, retorna true
    if (Notification.permission === 'granted') {
      console.log('✅ Permissão já concedida');
      return true;
    }

    // Se foi negada permanentemente, retorna false
    if (Notification.permission === 'denied') {
      console.warn('❌ Permissão negada pelo usuário');
      return false;
    }

    try {
      // Solicita permissão
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Permissão concedida!');
        return true;
      } else {
        console.warn('❌ Usuário negou permissão');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', error);
      return false;
    }
  }

  /**
   * Mostra uma notificação imediata (para teste)
   */
  static async showTestNotification(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Notificações não suportadas');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Permissão não concedida');
    }

    try {
      // Tenta usar Service Worker primeiro
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('SaveDin 🎯', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/favicon.webp',
          badge: '/favicon.webp',
          tag: 'test-notification',
          requireInteraction: false,
        } as NotificationOptions);
      } else {
        // Fallback: notificação nativa
        new Notification('SaveDin 🎯', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/favicon.webp',
        });
      }

      console.log('✅ Notificação de teste enviada');
    } catch (error) {
      console.error('❌ Erro ao mostrar notificação:', error);
      throw error;
    }
  }

  /**
   * Agenda uma notificação para um horário específico
   * Retorna o tag para poder cancelar depois
   */
  static scheduleNotification(
    scheduledTime: Date,
    options: {
      title: string;
      body: string;
      tag: string;
      data?: Record<string, unknown>;
    }
  ): string | null {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.warn('❌ Não pode agendar: sem permissão ou não suportado');
      return null;
    }

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('⚠️ Horário já passou, não agendando');
      return null;
    }

    console.log(`⏰ Agendando notificação para ${scheduledTime.toLocaleString()}`);
    console.log(`   Será disparada em ${Math.round(delay / 1000 / 60)} minutos`);

    // Salvar lembrete no localStorage para persistir entre reloads
    this.saveScheduledNotification({
      scheduledTime: scheduledTime.toISOString(),
      title: options.title,
      body: options.body,
      tag: options.tag,
      data: options.data,
    });

    // Agendar com setTimeout
    const timeoutId = window.setTimeout(async () => {
      console.log(`🔔 Disparando notificação: ${options.title}`);

      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(options.title, {
            body: options.body,
            icon: '/favicon.webp',
            badge: '/favicon.webp',
            tag: options.tag,
            data: options.data,
            requireInteraction: true,
            actions: [
              { action: 'open', title: 'Abrir' },
              { action: 'close', title: 'Fechar' },
            ],
          } as NotificationOptions);
        } else {
          new Notification(options.title, {
            body: options.body,
            icon: '/favicon.webp',
            tag: options.tag,
          });
        }

        // Remove do localStorage após disparar
        this.removeScheduledNotification(options.tag);
        this.timeouts.delete(options.tag);

        console.log('✅ Notificação disparada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao disparar notificação:', error);
      }
    }, delay);

    // Salvar referência do timeout
    this.timeouts.set(options.tag, timeoutId);

    return options.tag;
  }

  /**
   * Salva notificação agendada no localStorage
   */
  private static saveScheduledNotification(notification: ScheduledNotification): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    const notifications: ScheduledNotification[] = stored ? JSON.parse(stored) : [];

    // Remove duplicatas com mesmo tag
    const filtered = notifications.filter((n) => n.tag !== notification.tag);
    filtered.push(notification);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`💾 Lembrete salvo: ${notification.tag}`);
  }

  /**
   * Remove notificação agendada do localStorage
   */
  private static removeScheduledNotification(tag: string): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const notifications: ScheduledNotification[] = JSON.parse(stored);
    const filtered = notifications.filter((n) => n.tag !== tag);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`🗑️ Lembrete removido: ${tag}`);
  }

  /**
   * Cancela uma notificação agendada
   */
  static cancelScheduledNotification(tag: string): void {
    const timeoutId = this.timeouts.get(tag);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(tag);
    }
    this.removeScheduledNotification(tag);
    console.log(`❌ Lembrete cancelado: ${tag}`);
  }

  /**
   * Restaura notificações agendadas após reload do app
   * Deve ser chamado quando o app iniciar
   */
  static restoreScheduledNotifications(): void {
    if (Notification.permission !== 'granted') {
      console.log('📭 Sem permissão para restaurar lembretes');
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('📭 Nenhum lembrete agendado');
      return;
    }

    const notifications: ScheduledNotification[] = JSON.parse(stored);
    const now = new Date();
    let restored = 0;
    let expired = 0;

    notifications.forEach((notification) => {
      const scheduledTime = new Date(notification.scheduledTime);

      if (scheduledTime > now) {
        // Ainda não passou, reagendar
        this.scheduleNotification(scheduledTime, {
          title: notification.title,
          body: notification.body,
          tag: notification.tag,
          data: notification.data,
        });
        restored++;
      } else {
        // Já passou, remover
        this.removeScheduledNotification(notification.tag);
        expired++;
      }
    });

    console.log(`🔄 Lembretes restaurados: ${restored} | Expirados: ${expired}`);
  }

  /**
   * Lista todos os lembretes agendados
   */
  static getScheduledNotifications(): ScheduledNotification[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Limpa todos os lembretes
   */
  static clearAllNotifications(): void {
    // Cancelar todos os timeouts
    this.timeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.timeouts.clear();

    // Limpar localStorage
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 Todos os lembretes removidos');
  }
}
