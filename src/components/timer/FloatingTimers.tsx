import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Clock, Minimize2, X } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function FloatingTimers() {
  const { activeTimers, stopTimer, cancelTimer, formatTime } = useTimer();
  const [isMinimized, setIsMinimized] = useState(false);
  const [stoppingTimer, setStoppingTimer] = useState<{ id: string; type: 'task' | 'habit' } | null>(null);
  const [notes, setNotes] = useState('');

  const handleStopClick = (timerId: string, timerType: 'task' | 'habit') => {
    setStoppingTimer({ id: timerId, type: timerType });
  };

  const handleConfirmStop = async () => {
    if (!stoppingTimer) return;
    
    await stopTimer(stoppingTimer.id, stoppingTimer.type, notes);
    setStoppingTimer(null);
    setNotes('');
  };

  const handleCancelTimer = async (timerId: string, timerType: 'task' | 'habit') => {
    await cancelTimer(timerId, timerType);
  };

  if (activeTimers.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-3"
          >
            {activeTimers.map((timer, index) => {
              const progress = timer.estimatedTime 
                ? Math.min((timer.elapsedSeconds / (timer.estimatedTime * 60)) * 100, 100)
                : 0;
              
              const isOvertime = timer.estimatedTime && timer.elapsedSeconds > (timer.estimatedTime * 60);

              return (
                <motion.div
                  key={`${timer.type}-${timer.id}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className={`w-72 rounded-2xl shadow-2xl overflow-hidden border ${
                    isOvertime 
                      ? 'bg-destructive/10 border-destructive/50' 
                      : 'bg-card border-border'
                  }`}
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {timer.type === 'task' ? 'Tarefa' : 'Hábito'} {activeTimers.length > 1 ? `#${index + 1}` : ''}
                        </span>
                      </div>
                      <p className="font-semibold text-sm truncate">{timer.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCancelTimer(timer.id, timer.type)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div className="px-4 py-4 text-center">
                    <div className={`text-4xl font-mono font-bold ${isOvertime ? 'text-destructive' : 'text-foreground'}`}>
                      {formatTime(timer.elapsedSeconds)}
                    </div>
                    {timer.estimatedTime && (
                      <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Estimado: {timer.estimatedTime}min</span>
                        {isOvertime && (
                          <span className="text-destructive font-medium">
                            (+{Math.ceil((timer.elapsedSeconds / 60) - timer.estimatedTime)}min)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {timer.estimatedTime && (
                    <div className="px-4 pb-3">
                      <Progress 
                        value={progress} 
                        className={`h-2 ${isOvertime ? '[&>div]:bg-destructive' : ''}`}
                      />
                    </div>
                  )}

                  {/* Controls */}
                  <div className="px-4 pb-4">
                    <Button
                      variant={isOvertime ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleStopClick(timer.id, timer.type)}
                      className="w-full"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Parar
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized state */}
      <AnimatePresence>
        {isMinimized && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center"
          >
            <Clock className="h-6 w-6 animate-pulse" />
            {activeTimers.length > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                {activeTimers.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Stop confirmation dialog */}
      <Dialog open={!!stoppingTimer} onOpenChange={(open) => !open && setStoppingTimer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parar Cronômetro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deseja adicionar alguma observação sobre esta sessão?
            </p>
            <div className="space-y-2">
              <Label htmlFor="timer-notes">Anotações (opcional)</Label>
              <Textarea
                id="timer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Terminei mais rápido que esperado..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoppingTimer(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmStop}>
              Parar Cronômetro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
