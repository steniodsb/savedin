import { useMemo, useEffect, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertTriangle, Clock, CheckCircle2, Flame, Target, Play, Plus, Check, Sparkles, ListTodo, RotateCcw, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useGradientColors } from '@/hooks/useGradientColors';
import { useCollapsibleSections } from '@/hooks/useCollapsibleSections';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, addDays, subDays, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HabitDetailView } from '@/components/habits/HabitDetailView';
import { HabitCard } from '@/components/habits/HabitCard';
import { RoutineDetailView } from '@/components/habits/RoutineDetailView';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { SimpleTaskCard } from '@/components/tasks/SimpleTaskCard';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { useUIStore } from '@/store/useUIStore';
import { Habit, Routine, Task, Goal } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

// 3D Icons imports for tasks
import iconFolder from '@/assets/icons-3d-new/folder.png';
import iconTarget from '@/assets/icons-3d-new/target.png';
import iconCheck from '@/assets/icons-3d-new/check.png';
import iconPencil from '@/assets/icons-3d-new/pencil.png';
import iconFire from '@/assets/icons-3d-new/fire.png';
import iconBell from '@/assets/icons-3d-new/bell.png';
import iconStar from '@/assets/icons-3d-new/star.png';
import iconLeaf from '@/assets/icons-3d-new/leaf.png';
import iconRocket from '@/assets/icons-3d-new/rocket.png';
import iconClock from '@/assets/icons-3d-new/clock.png';

// Get 3D icon for task based on level and priority
const getTaskIcon = (level: string, priority: string) => {
  // Priority-based icons for urgent/high
  if (priority === 'urgent') return iconFire;
  if (priority === 'high') return iconBell;

  // Level-based icons
  switch (level) {
    case 'project': return iconFolder;
    case 'milestone': return iconTarget;
    case 'subtask': return iconPencil;
    case 'task':
    default:
      if (priority === 'medium') return iconStar;
      return iconCheck;
  }
};

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export function TodayView() {
  const {
    habits,
    habitLogs,
    routines,
    tasks,
    goals,
    toggleTaskComplete,
    completeHabit,
    getHabitCompletionForDate,
    setActiveTab,
    setPendingTaskToEdit,
    setPendingProjectToView,
    setPendingGoalToView,
    setFocusModeRoutine
  } = useStore();
  const { user } = useAuth();
  const gradientColors = useGradientColors();
  const progressGradientId = useId();
  const { isCollapsed, toggleSection } = useCollapsibleSections();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);
  const [streakCalendarMonth, setStreakCalendarMonth] = useState(new Date());

  // Detail view modals
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { setPendingHabitToEdit } = useUIStore();

  // Selected date for viewing different days
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const realToday = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();
  const isViewingToday = selectedDateStr === realToday;

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user?.id]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 18) return '🌤️';
    return '🌙';
  };

  const getUserName = () => {
    if (profile?.full_name) return profile.full_name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  };

  const getUserInitial = () => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const formatFullDate = (date: Date = selectedDate) => {
    const weekDay = format(date, "EEEE", { locale: ptBR });
    const dayMonth = format(date, "d 'de' MMMM", { locale: ptBR });
    // Capitalize first letter of weekday
    const capitalizedWeekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    return `${capitalizedWeekDay}, ${dayMonth}`;
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Filter habits scheduled for selected date
  const selectedDayHabits = useMemo(() => {
    return habits.filter((h) => {
      if (!h.isActive) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
      if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
      return false;
    });
  }, [habits, dayOfWeek]);

  // Get completed habits for selected date
  const completedHabitsForDate = useMemo(() => {
    return selectedDayHabits.filter(h => {
      const count = getHabitCompletionForDate(h.id, selectedDateStr);
      return count >= (h.timesPerDay || 1);
    }).length;
  }, [selectedDayHabits, selectedDateStr, getHabitCompletionForDate]);

  // Active routines for selected date
  const selectedDayRoutines = routines.filter((r) => r.isActive);

  // Tasks scheduled for selected date or due on selected date (excludes overdue tasks)
  const selectedDayTasks = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      if (t.status === 'completed') return false;

      // Check if task is for the selected date
      const isForSelectedDate = t.scheduledFor === selectedDateStr || t.dueDate === selectedDateStr;
      if (!isForSelectedDate) return false;

      // If due date exists, check if it's overdue (before today)
      if (t.dueDate) {
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        // Exclude overdue tasks - they go to "Em atraso" section
        if (dueDate.getTime() < todayStart.getTime()) return false;
      }

      return true;
    });
  }, [tasks, selectedDateStr]);

  // Completed tasks for selected date
  const completedTasksForDate = useMemo(() => {
    return tasks.filter(t =>
      t.status === 'completed' &&
      t.completedAt?.startsWith(selectedDateStr)
    );
  }, [tasks, selectedDateStr]);

  // Overdue tasks - only if due date is BEFORE today (not including today)
  const overdueTasks = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      // Only overdue if due date is strictly before today
      return dueDate.getTime() < todayStart.getTime();
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tasks]);

  // Project-type goals (for compatibility - projects are now goals)
  const projectGoals = useMemo(() => {
    return goals.filter(g => g.goalType === 'project' && g.status !== 'achieved' && g.status !== 'abandoned');
  }, [goals]);

  // Calculate activity streak - days with completed tasks/habits/goal progress
  const { currentStreak, activeDays } = useMemo(() => {
    const activeDaysSet = new Set<string>();

    // Add days with completed tasks
    tasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) {
        activeDaysSet.add(t.completedAt.split('T')[0]);
      }
    });

    // Add days with completed habits
    habitLogs.forEach(log => {
      if (log.date) {
        activeDaysSet.add(log.date);
      }
    });

    // Calculate current streak
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Check if today is active
    const todayStr = todayDate.toISOString().split('T')[0];
    let checkDate = new Date(todayDate);

    // If today is not active yet, start from yesterday
    if (!activeDaysSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDaysSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak: streak, activeDays: activeDaysSet };
  }, [tasks, habitLogs]);

  // Goals in progress
  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === 'in_progress' && !g.parentId);
  }, [goals]);

  const totalOverdue = overdueTasks.length;

  const getProjectForTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.linkedGoalId) return undefined;
    return goals.find(g => g.id === task.linkedGoalId);
  };

  const formatOverdueDays = (dueDate: string) => {
    const days = differenceInDays(new Date(), new Date(dueDate));
    if (days === 1) return 'há 1 dia';
    return `há ${days} dias`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-destructive';
      case 'high': return 'text-destructive';
      case 'medium': return 'text-yellow-500';
      default: return 'text-primary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      default: return 'Baixa';
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const handleStartRoutine = (routineId: string) => {
    setFocusModeRoutine(routineId);
  };

  const getHabitProgress = (habit: typeof habits[0]) => {
    const count = getHabitCompletionForDate(habit.id, selectedDateStr);
    const target = habit.timesPerDay || 1;
    return { count, target, completed: count >= target };
  };

  // Get routines with their habits' completion status
  const getRoutineProgress = (routine: typeof routines[0]) => {
    const routineHabits = habits.filter(h => h.routineId === routine.id);
    const completed = routineHabits.filter(h => {
      const { completed } = getHabitProgress(h);
      return completed;
    }).length;
    return { completed, total: routineHabits.length };
  };


  // Calculate daily progress
  const dailyProgress = useMemo(() => {
    const totalItems = selectedDayTasks.length + completedTasksForDate.length + selectedDayHabits.length;
    const completedItems = completedTasksForDate.length + completedHabitsForDate;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [selectedDayTasks, completedTasksForDate, selectedDayHabits, completedHabitsForDate]);

  // Streak calendar days
  const streakCalendarDays = useMemo(() => {
    const start = startOfMonth(streakCalendarMonth);
    const end = endOfMonth(streakCalendarMonth);
    return eachDayOfInterval({ start, end });
  }, [streakCalendarMonth]);

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="min-h-screen pb-24 lg:pb-4 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 pr-5 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {profile?.avatar_url ? (
              <motion.img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 shadow-lg shrink-0"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onError={(e) => {
                  // Fallback para inicial se a imagem falhar
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <motion.div
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary to-[hsl(var(--project-magenta))] flex items-center justify-center text-base font-bold text-primary-foreground shadow-lg shrink-0 ${profile?.avatar_url ? 'hidden' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {getUserInitial()}
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground flex items-center gap-1.5 truncate">
                <span className="truncate">{getGreeting()}, {getUserName()}</span>
                <span className="text-lg shrink-0">{getGreetingEmoji()}</span>
              </h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateDay('prev')}
                  className="p-0.5 rounded-full hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
                      {formatFullDate()}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setDatePickerOpen(false);
                        }
                      }}
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                    {!isViewingToday && (
                      <div className="p-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            goToToday();
                            setDatePickerOpen(false);
                          }}
                        >
                          Voltar para hoje
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => navigateDay('next')}
                  className="p-0.5 rounded-full hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Streak Flame */}
            <Popover open={streakOpen} onOpenChange={setStreakOpen}>
              <PopoverTrigger asChild>
                <motion.button
                  className={cn(
                    "relative flex items-center gap-1 px-2 py-1.5 rounded-full border transition-colors shadow-sm",
                    currentStreak > 0
                      ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-card border-border hover:border-muted-foreground/50"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Flame className={cn(
                    "h-4 w-4",
                    currentStreak > 0 ? "text-amber-500" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-bold",
                    currentStreak > 0 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {currentStreak}
                  </span>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Flame className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {currentStreak === 0
                          ? 'Nenhum dia ativo'
                          : currentStreak === 1
                            ? '1 dia ativo'
                            : `${currentStreak} dias seguidos`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentStreak === 0
                          ? 'Complete algo hoje para começar!'
                          : currentStreak < 3
                            ? 'Bom começo, continue!'
                            : currentStreak < 7
                              ? 'Ótimo ritmo!'
                              : currentStreak < 30
                                ? 'Você está em chamas! 🔥'
                                : 'Incrível dedicação!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini Calendar */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setStreakCalendarMonth(subMonths(streakCalendarMonth, 1))}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <span className="text-sm font-medium text-foreground capitalize">
                      {format(streakCalendarMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                      onClick={() => setStreakCalendarMonth(addMonths(streakCalendarMonth, 1))}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {weekDays.map((day, i) => (
                      <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: streakCalendarDays[0]?.getDay() || 0 }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-8 h-8" />
                    ))}

                    {streakCalendarDays.map((day) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const isActive = activeDays.has(dateStr);
                      const isCurrentDay = isSameDay(day, new Date());
                      const isFuture = day > new Date();

                      return (
                        <div
                          key={dateStr}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors",
                            isActive && !isFuture && "bg-amber-500 text-white font-medium",
                            !isActive && !isFuture && "text-muted-foreground",
                            isFuture && "text-muted-foreground/30",
                            isCurrentDay && !isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          )}
                        >
                          {day.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Notification Center */}
            <NotificationCenter />
          </div>
        </div>
      </motion.header>

      {/* Notification Permission Prompt */}
      <div className="mt-4">
        <NotificationPermissionPrompt />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4 mt-4"
      >
        {/* ========== HIGHLIGHT CARDS - 3 Columns on Desktop ========== */}
        <motion.section variants={item} className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Card 1: Daily Progress */}
          <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-md border border-border/10 p-5 lg:p-6 shadow-lg">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative flex items-center justify-between h-full">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Progresso do dia</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-bold text-foreground">{dailyProgress}%</span>
                  {dailyProgress >= 80 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <Sparkles className="h-3 w-3" />
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedTasksForDate.length + completedHabitsForDate} de {selectedDayTasks.length + completedTasksForDate.length + selectedDayHabits.length} itens
                </p>
              </div>
              <div className="relative w-16 h-16 lg:w-20 lg:h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <defs>
                    <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={gradientColors.color1} />
                      {gradientColors.color3 ? (
                        <>
                          <stop offset="50%" stopColor={gradientColors.color2} />
                          <stop offset="100%" stopColor={gradientColors.color3} />
                        </>
                      ) : (
                        <stop offset="100%" stopColor={gradientColors.color2} />
                      )}
                    </linearGradient>
                  </defs>
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                    className="opacity-15"
                  />
                  <motion.path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={`url(#${progressGradientId})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${dailyProgress}, 100`}
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${dailyProgress}, 100` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Habits */}
          <motion.button
            onClick={() => setActiveTab('habits')}
            className="relative overflow-hidden bg-card/50 backdrop-blur-md rounded-2xl p-5 lg:p-6 border border-border/10 text-left hover:border-primary/30 hover:shadow-lg hover:bg-card/60 transition-all shadow-lg group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <RotateCcw className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xl lg:text-2xl font-bold text-foreground">
                  {selectedDayHabits.length > 0 ? Math.round((completedHabitsForDate / selectedDayHabits.length) * 100) : 0}%
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">Hábitos</p>
              <p className="text-xs text-muted-foreground">
                {completedHabitsForDate}/{selectedDayHabits.length} concluídos
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-bg"
                  initial={{ width: 0 }}
                  animate={{ width: selectedDayHabits.length > 0 ? `${(completedHabitsForDate / selectedDayHabits.length) * 100}%` : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.button>

          {/* Card 3: Tasks */}
          <motion.button
            onClick={() => setActiveTab('tasks')}
            className="relative overflow-hidden bg-card/50 backdrop-blur-md rounded-2xl p-5 lg:p-6 border border-border/10 text-left hover:border-primary/30 hover:shadow-lg hover:bg-card/60 transition-all shadow-lg group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xl lg:text-2xl font-bold text-foreground">
                  {(selectedDayTasks.length + completedTasksForDate.length) > 0
                    ? Math.round((completedTasksForDate.length / (selectedDayTasks.length + completedTasksForDate.length)) * 100)
                    : 0}%
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">Tarefas</p>
              <p className="text-xs text-muted-foreground">
                {completedTasksForDate.length}/{selectedDayTasks.length + completedTasksForDate.length} concluídas
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-bg"
                  initial={{ width: 0 }}
                  animate={{
                    width: (selectedDayTasks.length + completedTasksForDate.length) > 0
                      ? `${(completedTasksForDate.length / (selectedDayTasks.length + completedTasksForDate.length)) * 100}%`
                      : '0%'
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* ========== DAILY ITEMS SECTIONS ========== */}

        {/* Section 1: Overdue Items - Full Width */}
        {overdueTasks.length > 0 && (
          <motion.section variants={item}>
            <CollapsibleSection
              id="dashboard-overdue"
              title="Em atraso"
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              badge={
                <span className="text-xs text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded-full">
                  {totalOverdue}
                </span>
              }
              isCollapsed={isCollapsed('dashboard-overdue')}
              onToggle={() => toggleSection('dashboard-overdue')}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                {overdueTasks.slice(0, 4).map((task) => (
                  <SimpleTaskCard key={task.id} task={task} onEdit={setSelectedTask} />
                ))}
              </div>
            </CollapsibleSection>
          </motion.section>
        )}

        {/* Section 2 & 3: Habits and Tasks - Side by Side on Desktop */}
        {(selectedDayHabits.length > 0 || selectedDayTasks.length > 0 || completedTasksForDate.length > 0) && (
          <motion.section variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left Column: Daily Habits */}
            <CollapsibleSection
              id="dashboard-habits"
              title={`Hábitos ${isViewingToday ? 'do dia' : 'do dia selecionado'}`}
              icon={<RotateCcw className="h-4 w-4 text-primary" />}
              isCollapsed={isCollapsed('dashboard-habits')}
              onToggle={() => toggleSection('dashboard-habits')}
              rightContent={
                <button
                  onClick={() => setActiveTab('habits')}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Ver todos
                </button>
              }
            >
              {selectedDayHabits.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayHabits.map((habit) => (
                    <HabitCard key={habit.id} habit={habit} selectedDate={selectedDateStr} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-card/30 rounded-2xl border border-border/10">
                  <RotateCcw className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum hábito para este dia</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Right Column: Daily Tasks */}
            <CollapsibleSection
              id="dashboard-tasks"
              title={`Tarefas ${isViewingToday ? 'do dia' : 'do dia selecionado'}`}
              icon={<ListTodo className="h-4 w-4 text-primary" />}
              isCollapsed={isCollapsed('dashboard-tasks')}
              onToggle={() => toggleSection('dashboard-tasks')}
              rightContent={
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Ver todas
                </button>
              }
            >
              {(selectedDayTasks.length > 0 || completedTasksForDate.length > 0) ? (
                <div className="space-y-2">
                  {selectedDayTasks.map((task) => (
                    <SimpleTaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => setSelectedTask(t)}
                    />
                  ))}
                  {completedTasksForDate.map((task) => (
                    <SimpleTaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => setSelectedTask(t)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-card/30 rounded-2xl border border-border/10">
                  <ListTodo className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa para este dia</p>
                </div>
              )}
            </CollapsibleSection>
          </motion.section>
        )}

        {/* Section 4: Goals Attention Card */}
        {(() => {
          const goalsNearDeadline = goals.filter(g => {
            if (g.status === 'achieved' || g.status === 'abandoned' || !g.endDate) return false;
            const days = differenceInDays(new Date(g.endDate), new Date());
            return (days >= 0 && days <= 7) || days < 0;
          });
          const goalsAttention = goalsNearDeadline.length;

          if (goalsAttention === 0) return null;

          return (
            <motion.section variants={item}>
              <motion.button
                onClick={() => setActiveTab('goals')}
                className="relative overflow-hidden w-full bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-border/10 text-left hover:border-[hsl(var(--project-magenta))]/30 hover:shadow-lg hover:bg-card/60 transition-all shadow-md"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[hsl(var(--project-magenta))]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--project-magenta))]/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-[hsl(var(--project-magenta))]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Metas precisam de atenção</p>
                      <p className="text-xs text-muted-foreground">{goalsAttention} {goalsAttention === 1 ? 'meta com prazo próximo' : 'metas com prazo próximo'}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(var(--project-magenta))]">{goalsAttention}</span>
                </div>
              </motion.button>
            </motion.section>
          );
        })()}

        {/* Empty State */}
        {selectedDayTasks.length === 0 && completedTasksForDate.length === 0 && selectedDayHabits.length === 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-[hsl(var(--project-magenta))]/20 flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-10 w-10 text-primary" />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Comece seu dia!
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Configure hábitos e tarefas para acompanhar seu progresso.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Detail View Modals */}
      {selectedHabit && (
        <HabitDetailView
          habit={selectedHabit}
          open={!!selectedHabit}
          onOpenChange={(open) => !open && setSelectedHabit(null)}
          onEdit={() => {
            setPendingHabitToEdit(selectedHabit.id);
            setSelectedHabit(null);
          }}
        />
      )}

      {selectedRoutine && (
        <RoutineDetailView
          routine={selectedRoutine}
          open={!!selectedRoutine}
          onOpenChange={(open) => !open && setSelectedRoutine(null)}
          onEdit={() => setSelectedRoutine(null)}
        />
      )}

      {selectedTask && (
        <TaskDetailView
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}

      {selectedGoal && (
        <GoalDetailsModal
          goalId={selectedGoal.id}
          open={!!selectedGoal}
          onOpenChange={(open) => !open && setSelectedGoal(null)}
        />
      )}

    </div>
  );
}