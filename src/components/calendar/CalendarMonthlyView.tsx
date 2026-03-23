import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

interface DayInfo {
  hasHabits: boolean;
  hasTasks: boolean;
  hasMilestones: boolean;
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  tasksTotal: number;
}

interface CalendarMonthlyViewProps {
  onDaySelect: (day: number, month: number, year: number) => void;
}

export function CalendarMonthlyView({ onDaySelect }: CalendarMonthlyViewProps) {
  const { habits, tasks, goals, getHabitCompletionForDate } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Precompute all day data
  const allDayData = useMemo(() => {
    const data: Record<number, DayInfo> = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = getDateStr(day);
      const dayOfWeek = new Date(year, month, day).getDay();

      // Get habits for this day
      const dayHabits = habits.filter((h) => {
        if (!h.isActive) return false;
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        return false;
      });

      const habitsDone = dayHabits.filter(h => 
        getHabitCompletionForDate(h.id, dateStr) >= h.timesPerDay
      ).length;

      // Get tasks for this day
      const dayTasks = tasks.filter((t) => 
        t.scheduledFor === dateStr || t.dueDate === dateStr
      );
      const tasksDone = dayTasks.filter(t => t.status === 'completed').length;

      // Get milestones for this day
      let hasMilestones = false;
      goals.forEach((goal) => {
        goal.milestones.forEach((m) => {
          if (m.targetDate === dateStr) {
            hasMilestones = true;
          }
        });
      });

      data[day] = {
        hasHabits: dayHabits.length > 0,
        hasTasks: dayTasks.length > 0,
        hasMilestones,
        habitsDone,
        habitsTotal: dayHabits.length,
        tasksDone,
        tasksTotal: dayTasks.length,
      };
    }
    
    return data;
  }, [year, month, habits, tasks, goals, daysInMonth, getHabitCompletionForDate]);

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const data = allDayData[day];
      const todayClass = isToday(day);

      days.push(
        <motion.button
          key={day}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: day * 0.008 }}
          onClick={() => onDaySelect(day, month, year)}
          className={cn(
            "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative",
            "hover:bg-card/70 border border-transparent hover:border-border/30",
            todayClass 
              ? "bg-primary text-primary-foreground ring-2 ring-primary shadow-[0_0_16px_hsl(var(--primary)/0.5)]" 
              : "bg-card/40 backdrop-blur-sm"
          )}
        >
          {/* Day Number */}
          <span className={cn(
            "text-sm font-semibold",
            todayClass ? "text-primary-foreground" : "text-foreground"
          )}>
            {day}
          </span>

          {/* Indicators */}
          <div className="flex gap-1 justify-center">
            {data.hasHabits && (
              <div className={cn(
                "w-2 h-2 rounded-full",
                data.habitsDone === data.habitsTotal && data.habitsTotal > 0
                  ? "bg-emerald-500"
                  : todayClass ? "bg-primary-foreground/60" : "bg-primary/60"
              )} />
            )}
            {data.hasTasks && (
              <div className={cn(
                "w-2 h-2 rounded-full",
                data.tasksDone === data.tasksTotal && data.tasksTotal > 0
                  ? "bg-blue-500"
                  : todayClass ? "bg-primary-foreground/60" : "bg-blue-500/60"
              )} />
            )}
            {data.hasMilestones && (
              <div className={cn(
                "w-2 h-2 rounded-full",
                todayClass ? "bg-primary-foreground/60" : "bg-purple-500"
              )} />
            )}
          </div>
        </motion.button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-4">
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Hábitos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">Tarefas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-muted-foreground">Marcos</span>
        </div>
      </div>
    </div>
  );
}
