import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Flame, Target, BarChart3, CheckCircle2, Eye } from 'lucide-react';
import { Habit, HabitColor } from '@/types';
import { useStore } from '@/store/useStore';
import { useCelebration } from '@/hooks/useCelebration';
import { cn } from '@/lib/utils';
import { HabitDetailView } from './HabitDetailView';
import { useUIStore } from '@/store/useUIStore';
import { Icon3D } from '@/components/ui/icon-picker';
import { useGoalsData } from '@/hooks/useGoalsData';
import { useGradientColors } from '@/hooks/useGradientColors';
import { format, subDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
const colorMap: Record<HabitColor, { accent: string; bg: string; text: string; progress: string }> = {
  red: { accent: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', progress: 'bg-red-500' },
  orange: { accent: 'bg-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', progress: 'bg-orange-500' },
  yellow: { accent: 'bg-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-500', progress: 'bg-yellow-500' },
  green: { accent: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', progress: 'bg-green-500' },
  teal: { accent: 'bg-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', progress: 'bg-teal-500' },
  blue: { accent: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', progress: 'bg-blue-500' },
  purple: { accent: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', progress: 'bg-purple-500' },
  pink: { accent: 'bg-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', progress: 'bg-pink-500' },
};

interface HabitCardProps {
  habit: Habit;
  compact?: boolean;
  selectedDate?: string; // YYYY-MM-DD format, defaults to today
}

export function HabitCard({ habit, compact = false, selectedDate }: HabitCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const { completeHabit, uncompleteHabit, getHabitCompletionForDate, habitLogs } = useStore();
  const { setPendingHabitToEdit } = useUIStore();
  const { celebrateCompletion, celebrateStreak } = useCelebration();
  const { goals } = useGoalsData();
  const { contrastColor } = useGradientColors();
  
  // Use selected date or default to today
  const dateToCheck = selectedDate || new Date().toISOString().split('T')[0];
  const completionCount = getHabitCompletionForDate(habit.id, dateToCheck);
  
  // Calculate actual streak and display state based on habit logs
  const { calculatedStreak, streakDisplayState } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Get all logs for this habit, sorted by date descending
    const logsForHabit = (habitLogs || [])
      .filter(log => log.habitId === habit.id && log.count >= habit.timesPerDay)
      .map(log => log.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (logsForHabit.length === 0) {
      return { calculatedStreak: 0, streakDisplayState: 'hidden' as const };
    }
    
    // Check if completed today
    const completedToday = logsForHabit.includes(todayStr);
    
    // Check yesterday
    const yesterday = subDays(today, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const completedYesterday = logsForHabit.includes(yesterdayStr);
    
    // Check 2 days ago
    const twoDaysAgo = subDays(today, 2);
    const twoDaysAgoStr = format(twoDaysAgo, 'yyyy-MM-dd');
    const completedTwoDaysAgo = logsForHabit.includes(twoDaysAgoStr);
    
    // Calculate actual consecutive streak from today or yesterday
    let streak = 0;
    let checkDate = completedToday ? today : completedYesterday ? yesterday : null;
    
    if (checkDate) {
      // Count backwards from the starting date
      let currentDate = checkDate;
      while (true) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (logsForHabit.includes(dateStr)) {
          streak++;
          currentDate = subDays(currentDate, 1);
        } else {
          break;
        }
      }
    }
    
    // Determine display state
    let displayState: 'active' | 'fading' | 'hidden';
    if (completedToday || completedYesterday) {
      displayState = 'active';
    } else if (completedTwoDaysAgo) {
      displayState = 'fading';
    } else {
      displayState = 'hidden';
    }
    
    return { 
      calculatedStreak: streak, 
      streakDisplayState: displayState 
    };
  }, [habit.id, habit.timesPerDay, habitLogs]);
  
  // Determine tracking type and completion logic
  const trackingType = habit.trackingType || 'simple';
  const targetValue = habit.targetValue || habit.timesPerDay;
  
  // Calculate completion based on tracking type
  const isCompleted = (() => {
    switch (trackingType) {
      case 'quantitative':
        return completionCount >= targetValue;
      case 'checklist':
        const checklistTarget = habit.requireAllItems 
          ? (habit.checklistItems?.length || 1) 
          : 1;
        return completionCount >= checklistTarget;
      case 'simple':
      default:
        return completionCount >= habit.timesPerDay;
    }
  })();
  
  // Check if we should show a progress bar
  const showProgressBar = trackingType === 'quantitative' || trackingType === 'checklist';
  const isCounter = trackingType === 'simple' && habit.timesPerDay > 1;
  
  // Calculate progress percentage
  const progressPercentage = (() => {
    switch (trackingType) {
      case 'quantitative':
        return targetValue > 0 ? Math.min(100, (completionCount / targetValue) * 100) : 0;
      case 'checklist':
        const total = habit.checklistItems?.length || 1;
        return Math.min(100, (completionCount / total) * 100);
      case 'simple':
      default:
        return habit.timesPerDay > 0 ? Math.min(100, (completionCount / habit.timesPerDay) * 100) : 0;
    }
  })();
  
  // Format progress label
  const progressLabel = (() => {
    switch (trackingType) {
      case 'quantitative':
        const unit = habit.customUnit || habit.unit || '';
        return `${completionCount}/${targetValue}${unit ? ` ${unit}` : ''}`;
      case 'checklist':
        return `${completionCount}/${habit.checklistItems?.length || 0} itens`;
      case 'simple':
      default:
        return habit.timesPerDay > 1 ? `${completionCount}/${habit.timesPerDay}` : '';
    }
  })();
  
  // Tracking type icon
  const TrackingIcon = trackingType === 'quantitative' ? BarChart3 : 
                       trackingType === 'checklist' ? CheckCircle2 : Check;
  
  const colors = colorMap[habit.color] || colorMap.blue;
  const linkedGoal = habit.linkedGoalId ? goals.find(g => g.id === habit.linkedGoalId) : null;

  // Frequency labels
  const frequencyLabels: Record<string, string> = {
    daily: 'Diariamente',
    weekly: 'Semanalmente',
    specific_days: 'Dias específicos',
    interval: 'Intervalo',
  };
  const frequencyLabel = frequencyLabels[habit.frequency] || 'Diariamente';

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      completeHabit(habit.id, dateToCheck);
      
      // Check if this completion will fully complete the habit
      const nextCount = completionCount + 1;
      const willComplete = (() => {
        switch (trackingType) {
          case 'quantitative':
            return nextCount >= targetValue;
          case 'checklist':
            const checklistTarget = habit.requireAllItems 
              ? (habit.checklistItems?.length || 1) 
              : 1;
            return nextCount >= checklistTarget;
          case 'simple':
          default:
            return nextCount >= habit.timesPerDay;
        }
      })();
      
      if (willComplete) {
        celebrateCompletion(e);
        const newStreak = habit.currentStreak + 1;
        celebrateStreak(newStreak);
      }
    } else {
      uncompleteHabit(habit.id, dateToCheck);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setActionMenuOpen(true);
  };

  const handleViewDetails = () => {
    setActionMenuOpen(false);
    setDetailOpen(true);
  };

  const handleMarkComplete = () => {
    setActionMenuOpen(false);
    if (!isCompleted) {
      completeHabit(habit.id, dateToCheck);
      
      const nextCount = completionCount + 1;
      const willComplete = (() => {
        switch (trackingType) {
          case 'quantitative':
            return nextCount >= targetValue;
          case 'checklist':
            const checklistTarget = habit.requireAllItems 
              ? (habit.checklistItems?.length || 1) 
              : 1;
            return nextCount >= checklistTarget;
          case 'simple':
          default:
            return nextCount >= habit.timesPerDay;
        }
      })();
      
      if (willComplete) {
        celebrateCompletion({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 } as React.MouseEvent);
        const newStreak = habit.currentStreak + 1;
        celebrateStreak(newStreak);
      }
    } else {
      uncompleteHabit(habit.id, dateToCheck);
    }
  };

  const handleEdit = () => {
    setPendingHabitToEdit(habit.id);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        onClick={handleCardClick}
        className={cn(
          'relative p-3 rounded-lg border text-card-foreground shadow-sm cursor-pointer',
          'bg-card/50 backdrop-blur-md border-border/10',
          isCompleted && 'bg-muted/40 border-border/5'
        )}
      >
        <div className={cn(
          'flex items-center gap-3',
          isCompleted && 'grayscale opacity-50'
        )}>
          {/* LEFT SIDE - All Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: Icon + Title + Frequency */}
            <div className="flex items-start gap-2">
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                colors.bg
              )}>
                <Icon3D icon={habit.icon} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-medium text-sm text-foreground truncate',
                  isCompleted && 'line-through'
                )}>
                  {habit.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{frequencyLabel}</span>
                  {trackingType !== 'simple' && (
                    <>
                      <span>•</span>
                      <TrackingIcon className="h-3 w-3" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Progress bar for quantitative/checklist OR counter for simple with multiple times */}
            {(showProgressBar || isCounter) && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                  colors.bg, colors.text
                )}>
                  {progressLabel}
                </div>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', colors.progress)}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Row 3: Streak + Linked Goal */}
            <div className="flex items-center gap-2 text-xs">
              {calculatedStreak > 0 && streakDisplayState !== 'hidden' && (
                <span 
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold",
                    streakDisplayState === 'active' 
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "bg-muted/50 text-muted-foreground grayscale"
                  )}
                >
                  <Flame className="h-3 w-3" />
                  {calculatedStreak} dias
                </span>
              )}
              
              {linkedGoal && (
                <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                  <Target className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{linkedGoal.title}</span>
                  {habit.contributionType && habit.contributionType !== 'none' && (
                    <span className="text-green-500 text-[10px]">
                      {habit.contributionType === 'simple' ? '+1' : 
                       habit.contributionType === 'custom' ? `+${habit.contributionValue}` : '🎯'}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - Checkbox (inside grayscale container for consistency) */}
          <button
            onClick={handleComplete}
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 self-center',
              isCompleted
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30 hover:border-primary'
            )}
          >
            <AnimatePresence>
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* Action Menu - Centered Dialog */}
      <Dialog open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
        <DialogContent className="max-w-[280px] p-0 gap-0 overflow-hidden">
          {/* Header with icon and title - centered */}
          <div className="flex flex-col items-center text-center p-5 pb-4">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-3',
              colors.bg
            )}>
              <Icon3D icon={habit.icon} size="md" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {habit.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{frequencyLabel}</p>
          </div>
          
          {/* Action buttons - centered */}
          <div className="p-3 pt-0 flex flex-col gap-2">
            <button
              onClick={handleViewDetails}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              Ver detalhes
            </button>
            <button
              onClick={handleMarkComplete}
              className={cn(
                "flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isCompleted 
                  ? "bg-muted/50 hover:bg-muted text-muted-foreground" 
                  : "gradient-bg"
              )}
              style={!isCompleted ? { color: contrastColor } : undefined}
            >
              <Check className="h-4 w-4" style={!isCompleted ? { color: contrastColor } : undefined} />
              {isCompleted ? 'Desmarcar conclusão' : 'Concluir hábito'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <HabitDetailView
        habit={habit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        selectedDate={selectedDate}
      />
    </>
  );
}
