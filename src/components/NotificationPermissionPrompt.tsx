import { useNotificationsNew } from '@/hooks/useNotificationsNew';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function NotificationPermissionPrompt() {
  const { isSupported, permission, requestPermission, testNotification, isGranted } = useNotificationsNew();
  const [isRequesting, setIsRequesting] = useState(false);

  // Não mostrar se não suportado
  if (!isSupported) {
    return null;
  }

  // Se já concedido, mostrar opção de testar
  if (permission === 'granted') {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Notificações Ativas</p>
            <p className="text-xs text-muted-foreground">
              Você receberá lembretes de tarefas e hábitos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testNotification}
          >
            <Bell className="h-4 w-4 mr-1" />
            Testar
          </Button>
        </div>
      </div>
    );
  }

  // Se foi negado, mostrar aviso
  if (permission === 'denied') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
            <BellOff className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-sm text-destructive">
              Notificações Bloqueadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Você bloqueou as notificações. Para receber lembretes, ative nas configurações do navegador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prompt para ativar
  const handleActivate = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Ativar Notificações</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receba lembretes de tarefas e hábitos no horário certo
          </p>
          <Button
            onClick={handleActivate}
            disabled={isRequesting}
            size="sm"
            className="mt-3"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1" />
                Ativar Lembretes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
