import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Circle, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/store/useStore';
import { Habit } from '@/types';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { HabitDetailView } from './HabitDetailView';
import { Icon3D } from '@/components/ui/icon-picker';

const habitColorClasses: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

interface HabitsGridViewProps {
  habits: Habit[];
}

export function HabitsGridView({ habits }: HabitsGridViewProps) {
  const { getHabitCompletionForDate, completeHabit, uncompleteHabit } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Calculate weeks to display (4 weeks)
  const today = new Date();
  const baseWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }); // Monday

  // Generate 4 weeks of dates
  const weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, weekIndex) => {
      const weekStart = addWeeks(baseWeekStart, weekIndex);
      return {
        weekNumber: weekIndex + 1,
        days: Array.from({ length: 7 }, (_, dayIndex) => {
          const date = addDays(weekStart, dayIndex);
          return {
            date,
            dateStr: format(date, 'yyyy-MM-dd'),
            dayNum: format(date, 'd'),
            dayName: format(date, 'EEE', { locale: ptBR }),
            isToday: isSameDay(date, today),
            isFuture: date > today,
          };
        }),
      };
    });
  }, [baseWeekStart]);

  // Calculate overall progress data for chart
  const chartData = useMemo(() => {
    const allDays = weeks.flatMap(w => w.days);
    return allDays.map(day => {
      if (day.isFuture) {
        return { day: day.dayNum, progress: null };
      }
      const totalHabits = habits.length;
      const completed = habits.filter(h => {
        const completion = getHabitCompletionForDate(h.id, day.dateStr);
        return completion >= h.timesPerDay;
      }).length;
      return {
        day: day.dayNum,
        date: day.dateStr,
        progress: totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0,
      };
    });
  }, [weeks, habits, getHabitCompletionForDate]);

  // Calculate habit progress percentage
  const getHabitProgress = (habit: Habit) => {
    const allDays = weeks.flatMap(w => w.days).filter(d => !d.isFuture);
    const completed = allDays.filter(d => {
      const completion = getHabitCompletionForDate(habit.id, d.dateStr);
      return completion >= habit.timesPerDay;
    }).length;
    return allDays.length > 0 ? Math.round((completed / allDays.length) * 100) : 0;
  };

  const handleToggle = async (habit: Habit, dateStr: string) => {
    const day = weeks.flatMap(w => w.days).find(d => d.dateStr === dateStr);
    if (day?.isFuture) return;
    
    const completion = getHabitCompletionForDate(habit.id, dateStr);
    const isCompleted = completion >= habit.timesPerDay;
    
    if (isCompleted) {
      await uncompleteHabit(habit.id, dateStr);
    } else {
      await completeHabit(habit.id, dateStr);
    }
  };

  const navigateWeeks = (direction: 'prev' | 'next') => {
    setWeekOffset(prev => direction === 'next' ? prev + 4 : prev - 4);
  };

  const goToCurrentWeek = () => setWeekOffset(0);

  // Week markers for chart (no longer used for labels inside chart)
  const weekMarkers = weeks.map((week, idx) => ({
    day: week.days[0].dayNum,
    label: `S${idx + 1}`,
  }));

  // Get label for navigation button
  const getNavigationLabel = () => {
    if (weekOffset === 0) return 'Atual';
    const firstWeekStart = weeks[0]?.days[0]?.date;
    const lastWeekEnd = weeks[3]?.days[6]?.date;
    if (firstWeekStart && lastWeekEnd) {
      return `${format(firstWeekStart, 'dd/MM', { locale: ptBR })} - ${format(lastWeekEnd, 'dd/MM', { locale: ptBR })}`;
    }
    return weekOffset > 0 ? 'Futuro' : 'Passado';
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card/50 backdrop-blur-md border border-border/30 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Progresso Geral dos Hábitos</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigateWeeks('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={weekOffset === 0 ? "default" : "outline"}
              size="sm"
              className="h-8 px-3 text-xs min-w-[80px]"
              onClick={goToCurrentWeek}
            >
              {getNavigationLabel()}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigateWeeks('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week labels above chart */}
        <div className="flex mb-2 ml-8 mr-2">
          {weeks.map((week, idx) => (
            <div key={idx} className="flex-1 text-center">
              <span className="text-[10px] font-medium text-muted-foreground">
                Semana {idx + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={6}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, 'Progresso']}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload?.date) {
                    return format(new Date(payload[0].payload.date), "d 'de' MMM", { locale: ptBR });
                  }
                  return `Dia ${label}`;
                }}
              />
              {weekMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.day}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
              ))}
              <Area
                type="monotone"
                dataKey="progress"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#progressGradient)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Habits Grid Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-card/50 backdrop-blur-md border border-border/30 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className={cn(
                  "sticky left-0 bg-card/90 backdrop-blur-sm z-10 text-left p-3 transition-all",
                  isCompact ? "min-w-[60px] w-[60px]" : "min-w-[180px]"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {isCompact ? '' : 'Hábito'}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setIsCompact(!isCompact)}
                          >
                            {isCompact ? (
                              <PanelLeft className="h-3.5 w-3.5" />
                            ) : (
                              <PanelLeftClose className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCompact ? 'Expandir coluna' : 'Compactar coluna'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </th>
                {weeks.map((week, weekIdx) => (
                  <th
                    key={weekIdx}
                    colSpan={7}
                    className="text-center p-2 border-l border-border/20"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      Semana {weekIdx + 1}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <th className={cn(
                  "sticky left-0 bg-card/90 backdrop-blur-sm z-10 p-2 transition-all",
                  isCompact ? "min-w-[60px] w-[60px]" : ""
                )} />
              {weeks.flatMap((week, weekIdx) =>
                  week.days.map((day, dayIdx) => (
                    <th
                      key={`${weekIdx}-${dayIdx}`}
                      className={cn(
                        "p-1 text-center w-9 min-w-9",
                        dayIdx === 0 && "border-l border-border/20"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {day.dayName.slice(0, 3)}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            day.isToday && "text-primary font-bold"
                          )}
                        >
                          {day.dayNum}
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const progress = getHabitProgress(habit);
                return (
                  <tr key={habit.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td 
                      className={cn(
                        "sticky left-0 bg-card/90 backdrop-blur-sm z-10 cursor-pointer hover:bg-muted/30 transition-all",
                        isCompact ? "p-2" : "p-3"
                      )}
                      onClick={() => setSelectedHabit(habit)}
                    >
                      {isCompact ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1">
                                <div
                                  className={cn(
                                    "w-1 h-6 rounded-full flex-shrink-0",
                                    habitColorClasses[habit.color] || 'bg-primary'
                                  )}
                                />
                                <Icon3D icon={habit.icon} size="sm" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="font-medium">{habit.title}</p>
                              <p className="text-xs text-muted-foreground">{progress}% concluído</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Icon3D icon={habit.icon} size="sm" />
                          <div
                            className={cn(
                              "w-1 h-8 rounded-full",
                              habitColorClasses[habit.color] || 'bg-primary'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {habit.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={progress} className="h-1.5 w-16" />
                              <span className="text-xs text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    {weeks.flatMap((week, weekIdx) =>
                      week.days.map((day, dayIdx) => {
                        const completion = getHabitCompletionForDate(habit.id, day.dateStr);
                        const isCompleted = completion >= habit.timesPerDay;
                        const isPartial = completion > 0 && completion < habit.timesPerDay;

                        return (
                          <td
                            key={`${weekIdx}-${dayIdx}`}
                            className={cn(
                              "p-1 w-9 min-w-9",
                              dayIdx === 0 && "border-l border-border/20"
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handleToggle(habit, day.dateStr)}
                                disabled={day.isFuture}
                                className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                  day.isFuture && "opacity-30 cursor-not-allowed",
                                  isCompleted && cn(
                                    "text-primary-foreground",
                                    habitColorClasses[habit.color] || 'bg-primary'
                                  ),
                                  isPartial && "bg-muted border-2 border-primary/50",
                                  !isCompleted && !isPartial && !day.isFuture && "bg-muted/50 hover:bg-muted"
                                )}
                              >
                                {isCompleted ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Circle className="h-3 w-3 text-muted-foreground/50" />
                                )}
                              </button>
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {habits.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p>Nenhum hábito criado ainda.</p>
          </div>
        )}
      </motion.div>

      {/* Habit Detail Modal */}
      {selectedHabit && (
        <HabitDetailView
          habit={selectedHabit}
          open={!!selectedHabit}
          onOpenChange={(open) => !open && setSelectedHabit(null)}
          onEdit={() => setIsEditOpen(true)}
        />
      )}
    </div>
  );
}
