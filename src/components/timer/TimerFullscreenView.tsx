import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Pause, Play, Square, Trash2, Clock, BarChart3 } from 'lucide-react';
import { useTimer, ActiveTimer, TimerItem } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createPortal } from 'react-dom';

interface TimerFullscreenViewProps {
  open: boolean;
  onClose: () => void;
  timer?: ActiveTimer | null;
  item?: TimerItem | null;
}

export function TimerFullscreenView({ open, onClose, timer: existingTimer, item }: TimerFullscreenViewProps) {
  const { user } = useAuth();
  const { startTimer, pauseTimer, resumeTimer, stopTimer, cancelTimer, formatTime, getTimerForItem, activeTimers } = useTimer();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get the active timer for the item (if it exists)
  const activeTimerFromHook = item ? getTimerForItem(item.id, item.type) : null;
  
  // Use existing timer, or get from hook based on item
  const timer = existingTimer || activeTimerFromHook;
  
  // Determine if we're in "ready to start" mode (item provided but no active timer)
  const isReadyToStart = !!item && !timer;
  
  // The display data - use timer if active, otherwise use item info
  const displayId = timer?.id || item?.id || '';
  const displayType = timer?.type || item?.type || 'task';
  const displayName = timer?.name || item?.name || '';
  const estimatedTimeFromProps = timer?.estimatedTime || item?.estimatedTime;

  // Fetch time history for this item
  const { data: timeHistory } = useQuery({
    queryKey: ['timer-history', displayId, displayType],
    queryFn: async () => {
      if (!displayId || !user) return null;

      const table = displayType === 'task' ? 'tasks' : 'habits';
      const { data: itemData } = await supabase
        .from(table)
        .select('total_time_spent, estimated_minutes')
        .eq('id', displayId)
        .single();

      const { data: lastSession } = await supabase
        .from('timer_sessions')
        .select('actual_time, ended_at')
        .eq('user_id', user.id)
        .eq('item_type', displayType)
        .eq('item_id', displayId)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('timer_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('item_type', displayType)
        .eq('item_id', displayId);

      return {
        totalSpentMinutes: itemData?.total_time_spent || 0,
        estimatedMinutes: itemData?.estimated_minutes,
        lastSessionMinutes: lastSession?.actual_time || null,
        lastSessionDate: lastSession?.ended_at,
        sessionCount: count || 0,
      };
    },
    enabled: !!displayId && open && !!user,
    refetchInterval: false,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowStopDialog(false);
      setShowCancelConfirm(false);
      setNotes('');
      setIsProcessing(false);
    }
  }, [open]);

  if (!open || !displayId) return null;

  const currentMinutes = timer ? Math.ceil(timer.elapsedSeconds / 60) : 0;
  const totalMinutesWithCurrent = (timeHistory?.totalSpentMinutes || 0) + currentMinutes;
  const estimatedMinutes = estimatedTimeFromProps || timeHistory?.estimatedMinutes || 0;
  
  const progress = estimatedMinutes > 0 
    ? Math.min((totalMinutesWithCurrent / estimatedMinutes) * 100, 150) 
    : 0;
  
  const isOverEstimate = estimatedMinutes > 0 && totalMinutesWithCurrent > estimatedMinutes;
  const overByMinutes = isOverEstimate ? totalMinutesWithCurrent - estimatedMinutes : 0;

  const handleStart = async () => {
    console.log('handleStart clicked', { item, isProcessing });
    if (!item || isProcessing) {
      console.log('handleStart blocked:', { hasItem: !!item, isProcessing });
      return;
    }
    setIsStarting(true);
    setIsProcessing(true);
    try {
      console.log('Calling startTimer...');
      const result = await startTimer(item);
      console.log('startTimer result:', result);
    } catch (err) {
      console.error('startTimer error:', err);
    } finally {
      setIsStarting(false);
      setIsProcessing(false);
    }
  };

  const handlePauseResume = async () => {
    console.log('handlePauseResume clicked', { timer, isProcessing });
    if (!timer || isProcessing) {
      console.log('handlePauseResume blocked:', { hasTimer: !!timer, isProcessing });
      return;
    }
    setIsProcessing(true);
    try {
      if (timer.isPaused) {
        console.log('Calling resumeTimer...');
        await resumeTimer(timer.id, timer.type);
      } else {
        console.log('Calling pauseTimer...');
        await pauseTimer(timer.id, timer.type);
      }
    } catch (err) {
      console.error('pauseResume error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    console.log('handleStop clicked');
    setShowStopDialog(true);
  };

  const handleConfirmStop = async () => {
    console.log('handleConfirmStop clicked', { timer, isProcessing });
    if (!timer || isProcessing) {
      console.log('handleConfirmStop blocked');
      return;
    }
    setIsProcessing(true);
    try {
      console.log('Calling stopTimer...');
      await stopTimer(timer.id, timer.type, notes);
      setShowStopDialog(false);
      setNotes('');
      onClose();
    } catch (err) {
      console.error('stopTimer error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!timer) {
      onClose();
      return;
    }
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (!timer || isProcessing) return;
    setIsProcessing(true);
    try {
      await cancelTimer(timer.id, timer.type);
      setShowCancelConfirm(false);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 bg-background flex flex-col"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Cronômetro</h1>
            <span className="text-xs text-muted-foreground">
              {displayType === 'task' ? '✅ Tarefa' : '🔁 Hábito'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full"
          type="button"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 overflow-auto">
        {/* Item name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {displayName}
          </h2>
          {estimatedMinutes > 0 && (
            <p className="text-sm text-muted-foreground">
              ⏱️ Tempo estimado: {estimatedMinutes} min
            </p>
          )}
        </motion.div>

        {/* Timer display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className={`text-7xl sm:text-8xl font-mono font-bold tabular-nums ${
            isOverEstimate ? 'text-destructive' : timer?.isPaused ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {timer ? formatTime(timer.elapsedSeconds) : '0:00'}
          </div>
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {isReadyToStart ? 'Pronto para iniciar' : timer?.isPaused ? '⏸️ Pausado' : '▶️ Em andamento'}
          </p>
        </motion.div>

        {/* Progress bar (if estimated and timer running) */}
        {estimatedMinutes > 0 && timer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className={isOverEstimate ? 'text-destructive font-medium' : 'text-foreground'}>
                {Math.round(progress)}%
              </span>
            </div>
            <Progress 
              value={Math.min(progress, 100)} 
              className={`h-3 ${isOverEstimate ? '[&>div]:bg-destructive' : ''}`}
            />
            {isOverEstimate && (
              <p className="text-sm text-destructive text-center">
                ⚠️ Passou {overByMinutes} min do estimado
              </p>
            )}
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 w-full max-w-md"
        >
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Esta sessão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{currentMinutes} min</p>
          </div>
          
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
            <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Total acumulado</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalMinutesWithCurrent} min</p>
          </div>
        </motion.div>

        {/* History info */}
        {timeHistory && timeHistory.sessionCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-muted-foreground"
          >
            <p>📊 {timeHistory.sessionCount} sessões anteriores</p>
            {timeHistory.lastSessionMinutes && (
              <p className="mt-1">Última sessão: {timeHistory.lastSessionMinutes} min</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-border space-y-3 bg-background">
        {isReadyToStart ? (
          <>
            <Button
              onClick={handleStart}
              size="lg"
              className="w-full gap-2"
              disabled={isStarting || isProcessing}
              type="button"
            >
              <Play className="h-5 w-5" />
              {isStarting ? 'Iniciando...' : 'Iniciar Cronômetro'}
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="lg"
              className="w-full gap-2"
              type="button"
            >
              <X className="h-5 w-5" />
              Fechar
            </Button>
          </>
        ) : showCancelConfirm ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Tem certeza que deseja cancelar? O tempo não será salvo.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCancelConfirm(false)}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isProcessing}
                type="button"
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirmCancel}
                variant="destructive"
                size="lg"
                className="flex-1 gap-2"
                disabled={isProcessing}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                {isProcessing ? 'Cancelando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              onClick={handlePauseResume}
              size="lg"
              variant="secondary"
              className="w-full gap-2"
              disabled={isProcessing}
              type="button"
            >
              {timer?.isPaused ? (
                <>
                  <Play className="h-5 w-5" />
                  Retomar Cronômetro
                </>
              ) : (
                <>
                  <Pause className="h-5 w-5" />
                  Pausar Cronômetro
                </>
              )}
            </Button>

            <Button
              onClick={handleStop}
              size="lg"
              className="w-full gap-2"
              disabled={isProcessing}
              type="button"
            >
              <Square className="h-5 w-5" />
              Parar e Salvar
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="lg"
              className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isProcessing}
              type="button"
            >
              <Trash2 className="h-5 w-5" />
              Cancelar sessão
            </Button>
          </>
        )}
      </div>

      {/* Stop confirmation dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>⏹️ Finalizar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-3xl font-bold text-foreground">{timer ? formatTime(timer.elapsedSeconds) : '0:00'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentMinutes} minutos registrados
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stop-notes">Adicionar nota (opcional)</Label>
              <Textarea
                id="stop-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Concluí a implementação do OAuth..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowStopDialog(false)}
              disabled={isProcessing}
              type="button"
            >
              Continuar
            </Button>
            <Button 
              onClick={handleConfirmStop}
              disabled={isProcessing}
              type="button"
            >
              {isProcessing ? 'Salvando...' : '💾 Salvar Sessão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return createPortal(content, document.body);
}
