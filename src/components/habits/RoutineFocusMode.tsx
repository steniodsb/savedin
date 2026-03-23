import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, SkipForward, Clock, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

export function RoutineFocusMode() {
  const { 
    focusModeRoutineId, 
    focusModeCurrentIndex, 
    setFocusModeRoutine, 
    advanceFocusMode,
    routines,
    habits,
    completeHabit
  } = useStore();

  const { celebrateCompletion, celebrateRoutineComplete } = useCelebration();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const routine = routines.find((r) => r.id === focusModeRoutineId);
  const routineHabits = routine?.habitIds.map((id) => habits.find((h) => h.id === id)).filter(Boolean) || [];
  const currentHabit = routineHabits[focusModeCurrentIndex];
  const progress = routineHabits.length > 0 ? ((focusModeCurrentIndex) / routineHabits.length) * 100 : 0;

  useEffect(() => {
    if (!focusModeRoutineId) return;
    
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [focusModeRoutineId]);

  useEffect(() => {
    if (focusModeCurrentIndex >= routineHabits.length && routineHabits.length > 0) {
      setIsComplete(true);
      celebrateRoutineComplete();
    }
  }, [focusModeCurrentIndex, routineHabits.length, celebrateRoutineComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = (e: React.MouseEvent) => {
    if (currentHabit) {
      completeHabit(currentHabit.id);
      celebrateCompletion(e);
      advanceFocusMode();
    }
  };

  const handleSkip = () => {
    advanceFocusMode();
  };

  const handleClose = () => {
    setFocusModeRoutine(null);
    setElapsedSeconds(0);
    setIsComplete(false);
  };

  if (!routine) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{routine.icon}</span>
          <div>
            <h2 className="font-semibold text-foreground">{routine.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{focusModeCurrentIndex} de {routineHabits.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className="w-24 h-24 rounded-full bg-status-completed/20 flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="h-12 w-12 text-status-completed" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Rotina Completa! 🎉</h2>
              <p className="text-muted-foreground mb-6">
                Concluída em {formatTime(elapsedSeconds)}
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-transform hover:scale-105 active:scale-95"
              >
                Finalizar
              </button>
            </motion.div>
          ) : currentHabit ? (
            <motion.div
              key={currentHabit.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center max-w-md"
            >
              <div className="w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-6 text-5xl">
                {currentHabit.icon}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{currentHabit.title}</h2>
              {currentHabit.description && (
                <p className="text-muted-foreground mb-8">{currentHabit.description}</p>
              )}
              
              {/* Actions */}
              <div className="flex items-center justify-center gap-4">
                {routine.allowSkip && (
                  <button
                    onClick={handleSkip}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted text-muted-foreground font-medium transition-all hover:bg-accent"
                  >
                    <SkipForward className="h-5 w-5" />
                    Pular
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl bg-status-completed text-primary-foreground font-semibold text-lg"
                >
                  <Check className="h-6 w-6" />
                  Concluído
                </motion.button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
