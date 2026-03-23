import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayStats {
  date: string;
  completed: number;
  total: number;
  rate: number;
}

interface CalendarHeatmapViewProps {
  onDaySelect: (day: number, month: number, year: number) => void;
}

export function CalendarHeatmapView({ onDaySelect }: CalendarHeatmapViewProps) {
  const { habits, tasks, goals, getHabitCompletionForDate } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const today = new Date();
  const isToday = (dateStr: string) => format(today, 'yyyy-MM-dd') === dateStr;

  // Calculate stats for each day
  const monthData = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    const stats: DayStats[] = [];
    let totalActive = 0;
    let totalCompleted = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();

      // Get habits for this day
      const dayHabits = habits.filter((h) => {
        if (!h.isActive) return false;
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        return false;
      });

      const habitsCompleted = dayHabits.filter(h => 
        getHabitCompletionForDate(h.id, dateStr) >= h.timesPerDay
      ).length;

      // Get tasks for this day
      const dayTasks = tasks.filter((t) => 
        t.scheduledFor === dateStr || t.dueDate === dateStr
      );
      const tasksCompleted = dayTasks.filter(t => t.status === 'completed').length;

      // Get milestones for this day
      let milestonesCompleted = 0;
      let milestonesTotal = 0;
      goals.forEach((goal) => {
        goal.milestones.forEach((m) => {
          if (m.targetDate === dateStr) {
            milestonesTotal++;
            if (m.isCompleted) milestonesCompleted++;
          }
        });
      });

      const completed = habitsCompleted + tasksCompleted + milestonesCompleted;
      const total = dayHabits.length + dayTasks.length + milestonesTotal;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      stats.push({ date: dateStr, completed, total, rate });

      // Calculate overall stats
      if (total > 0) {
        totalActive++;
        if (rate >= 70) totalCompleted++;
        
        // Streak calculation
        if (rate >= 70) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }

        // Current streak (from today backwards)
        if (day <= today && rate >= 70) {
          currentStreak = tempStreak;
        }
      }
    });

    const overallRate = totalActive > 0 ? Math.round((totalCompleted / totalActive) * 100) : 0;

    return { stats, totalActive, overallRate, maxStreak };
  }, [currentDate, habits, tasks, goals, getHabitCompletionForDate]);

  const getIntensityClass = (rate: number, total: number) => {
    if (total === 0) return 'bg-muted/20';
    if (rate === 0) return 'bg-muted/30';
    if (rate < 50) return 'bg-primary/30';
    if (rate < 80) return 'bg-primary/60';
    return 'bg-primary';
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const renderHeatmapDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    monthData.stats.forEach((dayStats, index) => {
      const day = index + 1;
      const todayClass = isToday(dayStats.date);

      days.push(
        <motion.button
          key={dayStats.date}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: day * 0.008 }}
          onClick={() => onDaySelect(day, month, year)}
          className={cn(
            "aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative",
            "hover:ring-2 hover:ring-primary/50",
            getIntensityClass(dayStats.rate, dayStats.total),
            todayClass && "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
          )}
          title={`${dayStats.completed}/${dayStats.total} (${dayStats.rate}%)`}
        >
          <span className={cn(
            "text-xs font-medium",
            dayStats.rate >= 80 || todayClass ? "text-primary-foreground" : "text-foreground",
            dayStats.total === 0 && "text-muted-foreground"
          )}>
            {day}
          </span>
          {dayStats.completed > 0 && (
            <span className={cn(
              "text-[10px] font-bold",
              dayStats.rate >= 80 ? "text-primary-foreground/80" : "text-foreground/60"
            )}>
              {dayStats.completed}
            </span>
          )}
        </motion.button>
      );
    });

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/10 text-foreground hover:bg-card/70 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-base font-semibold text-foreground">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/10 text-foreground hover:bg-card/70 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((name, i) => (
          <div
            key={i}
            className="aspect-square flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderHeatmapDays()}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-xs text-muted-foreground">Menos</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <div className="w-4 h-4 rounded bg-primary/30" />
          <div className="w-4 h-4 rounded bg-primary/60" />
          <div className="w-4 h-4 rounded bg-primary" />
        </div>
        <span className="text-xs text-muted-foreground">Mais</span>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-border/10 rounded-xl p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{monthData.totalActive}</p>
          <p className="text-xs text-muted-foreground">Dias ativos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/50 backdrop-blur-sm border border-border/10 rounded-xl p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-500">{monthData.overallRate}%</p>
          <p className="text-xs text-muted-foreground">Taxa conclusão</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-sm border border-border/10 rounded-xl p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-500">{monthData.maxStreak}</p>
          <p className="text-xs text-muted-foreground">Melhor streak</p>
        </motion.div>
      </div>
    </div>
  );
}
