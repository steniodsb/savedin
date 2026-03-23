import { useState, useEffect, useMemo } from 'react';
import { Bell, BellOff, BellRing, Smartphone, Clock, AlertCircle, CheckCircle2, Target, CalendarClock, Zap, Calendar, CalendarDays, Globe, Sun, Moon, Save, Loader2, ExternalLink, Send, X, Bed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePushNotifications, NotificationFrequency, NotificationPreferences } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Common timezones for Brazil and other countries
const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
];

// Time options for notification schedules (every 30 minutes)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { value, label: value };
});

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    preferences,
    subscribe,
    unsubscribe,
    updatePreference,
    savePreferences,
    sendTestNotification,
  } = usePushNotifications();

  // Local state for tracking changes
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Update local preferences when preferences change (e.g., on load)
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(localPreferences) !== JSON.stringify(preferences);
  }, [localPreferences, preferences]);

  // Check if running in Lovable preview iframe (NOT the published app)
  const isInPreviewIframe = useMemo(() => {
    try {
      const hostname = window.location.hostname;
      // Only flag as preview if:
      // 1. Inside an iframe (preview window)
      // 2. On lovableproject.com (sandbox)
      // 3. On id-preview-- subdomain (preview URL format)
      const isInIframe = window.self !== window.top;
      const isLovableProjectDomain = hostname.includes('lovableproject.com');
      const isPreviewSubdomain = hostname.includes('id-preview--');
      
      return isInIframe || isLovableProjectDomain || isPreviewSubdomain;
    } catch {
      return true;
    }
  }, []);

  const handleLocalPreferenceChange = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update all preferences at once
      for (const key of Object.keys(localPreferences) as (keyof NotificationPreferences)[]) {
        if (localPreferences[key] !== preferences[key]) {
          updatePreference(key, localPreferences[key]);
        }
      }
      await savePreferences(localPreferences);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalPreferences(preferences);
  };

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    if (isInPreviewIframe) {
      toast.info(
        'Notificações não funcionam no preview do Lovable. Abra o app diretamente no navegador para testar.',
        { duration: 5000 }
      );
      return;
    }
    
    setIsTesting(true);
    try {
      await sendTestNotification();
    } finally {
      setIsTesting(false);
    }
  };

  const getPermissionStatus = () => {
    if (!isSupported) {
      return {
        icon: AlertCircle,
        text: 'Notificações não suportadas neste navegador',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
    }
    
    switch (permission) {
      case 'granted':
        return {
          icon: CheckCircle2,
          text: 'Permissão concedida',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
        };
      case 'denied':
        return {
          icon: BellOff,
          text: 'Permissão bloqueada pelo navegador',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
        };
      default:
        return {
          icon: Bell,
          text: 'Permissão pendente',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  const notificationTypes = [
    {
      key: 'overdueTasks' as const,
      icon: Clock,
      label: 'Tarefas atrasadas',
      description: 'Alertas quando tarefas passarem do prazo',
      iconColor: 'text-destructive',
    },
    {
      key: 'upcomingDeadlines' as const,
      icon: CalendarClock,
      label: 'Prazos próximos',
      description: 'Lembretes de tarefas com prazo chegando',
      iconColor: 'text-amber-500',
    },
    {
      key: 'habitReminders' as const,
      icon: Smartphone,
      label: 'Lembretes de hábitos',
      description: 'Notificações para manter sua rotina',
      iconColor: 'text-primary',
    },
    {
      key: 'goalProgress' as const,
      icon: Target,
      label: 'Progresso de metas',
      description: 'Atualizações sobre suas metas',
      iconColor: 'text-green-500',
    },
  ];

  const frequencyOptions: { value: NotificationFrequency; icon: typeof Zap; label: string; description: string }[] = [
    {
      value: 'immediate',
      icon: Zap,
      label: 'Imediato',
      description: 'Receba notificações assim que ocorrerem',
    },
    {
      value: 'daily',
      icon: Calendar,
      label: 'Resumo diário',
      description: 'Um resumo por dia às 9h',
    },
    {
      value: 'weekly',
      icon: CalendarDays,
      label: 'Resumo semanal',
      description: 'Um resumo toda segunda-feira',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Configurar Notificações
          </DialogTitle>
          <DialogClose className="absolute right-0 top-0 rounded-full p-2 bg-muted/50 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview Warning */}
          {isInPreviewIframe && (
            <div className="rounded-xl p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Modo de preview
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    As notificações push não funcionam no preview. Para testar, abra o app publicado diretamente no navegador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className={cn('rounded-xl p-4', status.bgColor)}>
            <div className="flex items-center gap-3">
              <StatusIcon className={cn('h-5 w-5', status.color)} />
              <div className="flex-1">
                <p className={cn('text-sm font-medium', status.color)}>
                  {status.text}
                </p>
                {permission === 'denied' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para ativar, altere nas configurações do navegador
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Push Notifications Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Notificações Push</p>
                <p className="text-sm text-muted-foreground">
                  Receba alertas mesmo com o app fechado
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggleNotifications}
              disabled={isLoading || !isSupported || permission === 'denied'}
            />
          </div>

          {/* Frequency Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground px-1">
              Frequência dos lembretes
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              {frequencyOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = localPreferences.frequency === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleLocalPreferenceChange('frequency', option.value)}
                    disabled={!isSubscribed}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                      !isSubscribed && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium', isSelected && 'text-primary')}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <p className="text-xs text-muted-foreground px-1 mb-4">
              {frequencyOptions.find(o => o.value === localPreferences.frequency)?.description}
            </p>
          </div>

          {/* Timezone & Time Settings */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground px-1">
              Fuso horário e horários
            </p>
            
            {/* Timezone */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Fuso horário</p>
                  <p className="text-xs text-muted-foreground">Seu fuso horário local</p>
                </div>
              </div>
              <Select
                value={localPreferences.timezone}
                onValueChange={(value) => handleLocalPreferenceChange('timezone', value)}
                disabled={!isSubscribed}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Morning Notification Time */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Lembrete matinal</p>
                  <p className="text-xs text-muted-foreground">Tarefas do dia</p>
                </div>
              </div>
              <Select
                value={localPreferences.morningNotificationTime}
                onValueChange={(value) => handleLocalPreferenceChange('morningNotificationTime', value)}
                disabled={!isSubscribed}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="08:00" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Evening Notification Time */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Lembrete noturno</p>
                  <p className="text-xs text-muted-foreground">Tarefas de amanhã</p>
                </div>
              </div>
              <Select
                value={localPreferences.eveningNotificationTime}
                onValueChange={(value) => handleLocalPreferenceChange('eveningNotificationTime', value)}
                disabled={!isSubscribed}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="18:00" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bedtime Hour - for habit evening reminders */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Bed className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Horário de dormir</p>
                  <p className="text-xs text-muted-foreground">Lembrete de hábitos 2h antes</p>
                </div>
              </div>
              <Select
                value={localPreferences.bedtimeHour || '22:00'}
                onValueChange={(value) => handleLocalPreferenceChange('bedtimeHour', value)}
                disabled={!isSubscribed}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="22:00" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isSubscribed && (
              <p className="text-xs text-muted-foreground px-1">
                Ative as notificações push para configurar horários
              </p>
            )}
          </div>

          {/* Granular Notification Settings */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground px-1">
              Tipos de notificação
            </p>
            
            <div className="space-y-2">
              {notificationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div 
                    key={type.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', type.iconColor)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={localPreferences[type.key]}
                      onCheckedChange={(checked) => handleLocalPreferenceChange(type.key, checked)}
                      disabled={!isSubscribed}
                    />
                  </div>
                );
              })}
            </div>

            {!isSubscribed && (
              <p className="text-xs text-muted-foreground px-1 mt-2">
                Ative as notificações push para configurar os tipos
              </p>
            )}
          </div>

          {/* Info Box */}
          {!isSupported && (
            <div className="p-4 rounded-xl bg-muted border border-border">
              <p className="text-sm text-muted-foreground">
                Para receber notificações push, use um navegador compatível como 
                Chrome, Firefox, Edge ou Safari (iOS 16.4+).
              </p>
            </div>
          )}

          {/* Unsaved Changes Indicator */}
          {hasChanges && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                Você tem alterações não salvas
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Save/Cancel Row */}
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges || isSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2 flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
            
            {/* Test Button */}
            {isSubscribed && (
              <Button
                variant="secondary"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="gap-2 w-full"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isTesting ? 'Enviando...' : 'Testar Notificação'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
