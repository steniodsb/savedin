import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit2, Clock, Play, CheckCircle2, Circle, 
  Sunrise, Sun, Moon, Sparkles, X, Trash2, Archive
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Routine, Habit, HabitColor } from '@/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Icon3D } from '@/components/ui/icon-picker';

const colorMap: Record<HabitColor, { bg: string; text: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
};

const timeOfDayConfig: Record<string, { label: string; icon: typeof Sunrise; color: string }> = {
  morning: { label: 'Manhã', icon: Sunrise, color: 'text-amber-500' },
  afternoon: { label: 'Tarde', icon: Sun, color: 'text-orange-500' },
  evening: { label: 'Noite', icon: Moon, color: 'text-indigo-500' },
  anytime: { label: 'Qualquer hora', icon: Sparkles, color: 'text-purple-500' },
};

interface RoutineDetailViewProps {
  routine: Routine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function RoutineDetailView({ routine, open, onOpenChange, onEdit }: RoutineDetailViewProps) {
  const { habits, getHabitCompletionForDate, setFocusModeRoutine, deleteRoutine, updateRoutine } = useStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const routineHabits = habits.filter((h) => routine.habitIds.includes(h.id));
  const completedHabits = routineHabits.filter(
    (h) => getHabitCompletionForDate(h.id, today) >= h.timesPerDay
  );
  const progress = routineHabits.length > 0 
    ? (completedHabits.length / routineHabits.length) * 100 
    : 0;
  const isCompleted = progress === 100;

  const timeConfig = timeOfDayConfig[routine.timeOfDay];
  const TimeIcon = timeConfig.icon;

  const handleStartFocusMode = () => {
    onOpenChange(false);
    setFocusModeRoutine(routine.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-primary/5">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors shadow-sm z-10"
          >
            <X className="h-4 w-4" />
          </motion.button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-background/80 backdrop-blur-sm shadow-sm">
              {routine.icon}
            </div>
            
            <div className="flex-1 min-w-0 pr-10">
              <h2 className="text-xl font-semibold text-foreground">{routine.title}</h2>
              {routine.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {routine.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium',
                  timeConfig.color
                )}>
                  <TimeIcon className="h-3.5 w-3.5" />
                  {timeConfig.label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {routine.estimatedMinutes} min
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-6">
          {/* Progress */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Progresso de hoje</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Rotina concluída
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-sm font-medium text-primary tabular-nums">
                {completedHabits.length}/{routineHabits.length}
              </span>
            </div>
          </div>

          {/* Habits List */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              Hábitos da rotina ({routineHabits.length})
            </h3>
            <div className="space-y-2">
              {routineHabits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum hábito adicionado a esta rotina
                </p>
              ) : (
                routineHabits.map((habit, idx) => {
                  const colors = colorMap[habit.color];
                  const completion = getHabitCompletionForDate(habit.id, today);
                  const habitCompleted = completion >= habit.timesPerDay;
                  
                  return (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                        habitCompleted 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-muted/30 border-border'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        colors.bg
                      )}>
                        <Icon3D icon={habit.icon} size="lg" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          habitCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {habit.title}
                        </p>
                        {habit.timesPerDay > 1 && (
                          <p className={cn('text-xs', colors.text)}>
                            {completion}/{habit.timesPerDay}
                          </p>
                        )}
                      </div>
                      
                      {habitCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Settings info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {routine.allowSkip ? 'Permite pular hábitos' : 'Todos os hábitos obrigatórios'}
            </span>
            <span>•</span>
            <span>{routine.isActive ? 'Ativa' : 'Inativa'}</span>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                updateRoutine(routine.id, { isActive: false });
                toast({ title: 'Rotina arquivada' });
                onOpenChange(false);
              }}
            >
              <Archive className="h-4 w-4" />
              Arquivar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
          
          {/* Focus Mode button */}
          {!isCompleted && routineHabits.length > 0 && (
            <Button
              className="w-full mt-2 gap-2"
              onClick={handleStartFocusMode}
            >
              <Play className="h-4 w-4" />
              Iniciar Foco
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              O item será movido para a lixeira por 24h antes da exclusão definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteRoutine(routine.id);
                toast({ title: 'Rotina excluída' });
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
