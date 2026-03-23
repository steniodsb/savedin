import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Check } from 'lucide-react';
import { Routine } from '@/types';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { RoutineDetailView } from './RoutineDetailView';

interface RoutineCardProps {
  routine: Routine;
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { habits, getHabitCompletionForDate, setFocusModeRoutine } = useStore();
  const { setPendingRoutineToEdit } = useUIStore();
  const today = new Date().toISOString().split('T')[0];

  const routineHabits = habits.filter((h) => routine.habitIds.includes(h.id));
  const completedHabits = routineHabits.filter(
    (h) => getHabitCompletionForDate(h.id, today) >= h.timesPerDay
  );
  const progress = routineHabits.length > 0 
    ? (completedHabits.length / routineHabits.length) * 100 
    : 0;
  const isCompleted = progress === 100;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setDetailOpen(true);
  };

  const handleEdit = () => {
    setPendingRoutineToEdit(routine.id);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleCardClick}
        className={cn(
          'relative overflow-hidden rounded-2xl p-5 cursor-pointer',
          'bg-card/50 backdrop-blur-md border border-border/10',
          isCompleted && 'opacity-20 grayscale bg-muted/20'
        )}
      >
        {/* Accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-primary/10">
            {routine.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold text-foreground text-lg',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {routine.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {routine.estimatedMinutes} min
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span>
                {completedHabits.length}/{routineHabits.length} hábitos
              </span>
            </div>
          </div>

          {!isCompleted ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setFocusModeRoutine(routine.id);
              }}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
            >
              <Play className="h-5 w-5 ml-0.5" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10">
              <Check className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>

        {!isCompleted && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      <RoutineDetailView
        routine={routine}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
      />
    </>
  );
}
