import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Target,
  BarChart3,
  Percent,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useStore } from '@/store/useStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Icon3D } from '@/components/ui/icon-picker';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Habit } from '@/types';

interface HabitStatisticsProps {
  periodStartDate: Date;
  periodEndDate: Date;
  daysInPeriod: number;
  periodLabel: string;
  previousPeriodStartDate?: Date;
  previousPeriodEndDate?: Date;
}

const dayOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dayOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function HabitStatistics({ 
  periodStartDate, 
  periodEndDate, 
  daysInPeriod, 
  periodLabel,
  previousPeriodStartDate,
  previousPeriodEndDate
}: HabitStatisticsProps) {
  const { habits, habitLogs, getHabitCompletionForDate } = useStore();
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');

  const activeHabits = habits.filter(h => h.isActive);

  // Calculate completion rate over time
  const completionRateData = useMemo(() => {
    const data: { date: string; name: string; rate: number; completed: number; total: number }[] = [];
    const interval = daysInPeriod > 60 ? 7 : daysInPeriod > 30 ? 3 : 1;
    
    const filteredHabits = selectedHabitId === 'all' 
      ? activeHabits 
      : activeHabits.filter(h => h.id === selectedHabitId);

    for (let i = daysInPeriod - 1; i >= 0; i -= interval) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();

      let totalScheduled = 0;
      let totalCompleted = 0;

      // Aggregate for interval days
      for (let j = 0; j < interval && i - j >= 0; j++) {
        const checkDate = subDays(new Date(), i - j);
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        const checkDayOfWeek = checkDate.getDay();

        filteredHabits.forEach(habit => {
          // Check if habit should be done on this day
          const shouldBeDone = 
            habit.frequency === 'daily' ||
            (habit.frequency === 'weekly' && habit.daysOfWeek?.includes(checkDayOfWeek)) ||
            (habit.frequency === 'specific_days' && habit.daysOfWeek?.includes(checkDayOfWeek));

          if (shouldBeDone) {
            totalScheduled++;
            const completions = getHabitCompletionForDate(habit.id, checkDateStr);
            if (completions >= habit.timesPerDay) {
              totalCompleted++;
            }
          }
        });
      }

      const rate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

      data.push({
        date: dateStr,
        name: format(date, daysInPeriod > 30 ? 'dd/MM' : 'dd'),
        rate,
        completed: totalCompleted,
        total: totalScheduled
      });
    }

    return data;
  }, [daysInPeriod, activeHabits, selectedHabitId, getHabitCompletionForDate]);

  // Calculate summary statistics with comparison to previous period
  const summaryStats = useMemo(() => {
    const filteredHabits = selectedHabitId === 'all' 
      ? activeHabits 
      : activeHabits.filter(h => h.id === selectedHabitId);

    let totalScheduled = 0;
    let totalCompleted = 0;
    const dayCompletions: Record<number, { completed: number; total: number }> = {};

    // Initialize day completions
    for (let d = 0; d < 7; d++) {
      dayCompletions[d] = { completed: 0, total: 0 };
    }

    // Calculate for the period
    for (let i = 0; i < daysInPeriod; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();

      filteredHabits.forEach(habit => {
        const shouldBeDone = 
          habit.frequency === 'daily' ||
          (habit.frequency === 'weekly' && habit.daysOfWeek?.includes(dayOfWeek)) ||
          (habit.frequency === 'specific_days' && habit.daysOfWeek?.includes(dayOfWeek));

        if (shouldBeDone) {
          totalScheduled++;
          dayCompletions[dayOfWeek].total++;

          const completions = getHabitCompletionForDate(habit.id, dateStr);
          if (completions >= habit.timesPerDay) {
            totalCompleted++;
            dayCompletions[dayOfWeek].completed++;
          }
        }
      });
    }

    // Calculate previous period stats for comparison
    let prevTotalScheduled = 0;
    let prevTotalCompleted = 0;
    if (previousPeriodStartDate && previousPeriodEndDate) {
      const prevDays = Math.ceil((previousPeriodEndDate.getTime() - previousPeriodStartDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < prevDays; i++) {
        const date = subDays(previousPeriodEndDate, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();

        filteredHabits.forEach(habit => {
          const shouldBeDone = 
            habit.frequency === 'daily' ||
            (habit.frequency === 'weekly' && habit.daysOfWeek?.includes(dayOfWeek)) ||
            (habit.frequency === 'specific_days' && habit.daysOfWeek?.includes(dayOfWeek));

          if (shouldBeDone) {
            prevTotalScheduled++;
            const completions = getHabitCompletionForDate(habit.id, dateStr);
            if (completions >= habit.timesPerDay) {
              prevTotalCompleted++;
            }
          }
        });
      }
    }

    // Find best and worst day of week
    let bestDayIndex = 0;
    let bestDayRate = 0;
    let worstDayIndex = 0;
    let worstDayRate = 100;
    
    Object.entries(dayCompletions).forEach(([day, data]) => {
      const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
      if (rate > bestDayRate) {
        bestDayRate = rate;
        bestDayIndex = parseInt(day);
      }
      if (data.total > 0 && rate < worstDayRate) {
        worstDayRate = rate;
        worstDayIndex = parseInt(day);
      }
    });

    // Calculate streak stats
    const longestStreak = Math.max(...filteredHabits.map(h => h.longestStreak), 0);
    const currentStreak = Math.max(...filteredHabits.map(h => h.currentStreak), 0);
    const avgStreak = filteredHabits.length > 0 
      ? Math.round(filteredHabits.reduce((acc, h) => acc + h.currentStreak, 0) / filteredHabits.length)
      : 0;

    // Calculate comparison percentages
    const currentRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const prevRate = prevTotalScheduled > 0 ? Math.round((prevTotalCompleted / prevTotalScheduled) * 100) : 0;
    const rateDiff = currentRate - prevRate;
    
    const completionsDiff = prevTotalCompleted > 0 
      ? Math.round(((totalCompleted - prevTotalCompleted) / prevTotalCompleted) * 100)
      : totalCompleted > 0 ? 100 : 0;

    return {
      avgCompletionRate: currentRate,
      totalCompleted,
      totalScheduled,
      bestDayOfWeek: dayOfWeekNames[bestDayIndex],
      bestDayRate: Math.round(bestDayRate),
      worstDayOfWeek: dayOfWeekNames[worstDayIndex],
      worstDayRate: Math.round(worstDayRate),
      longestStreak,
      currentStreak,
      avgStreak,
      activeHabitsCount: filteredHabits.length,
      comparisons: {
        rateDiff,
        completionsDiff
      }
    };
  }, [daysInPeriod, activeHabits, selectedHabitId, getHabitCompletionForDate, previousPeriodStartDate, previousPeriodEndDate]);

  // Distribution pie chart data
  const distributionData = useMemo(() => {
    const completed = summaryStats.totalCompleted;
    const notCompleted = summaryStats.totalScheduled - summaryStats.totalCompleted;
    
    return [
      { name: 'Concluídos', value: completed, fill: 'hsl(142, 76%, 36%)' },
      { name: 'Não concluídos', value: notCompleted, fill: 'hsl(var(--muted-foreground))' }
    ].filter(item => item.value > 0);
  }, [summaryStats]);

  // Individual habit heatmap data (GitHub style)
  const habitHeatmapData = useMemo(() => {
    const weeksToShow = Math.min(Math.ceil(daysInPeriod / 7), 12);
    const habitsToShow = activeHabits.slice(0, 8);
    
    return habitsToShow.map(habit => {
      const weekData: { week: number; completions: number[]; dates: string[] }[] = [];
      
      for (let w = weeksToShow - 1; w >= 0; w--) {
        const weekCompletions: number[] = [];
        const weekDates: string[] = [];
        
        for (let d = 6; d >= 0; d--) {
          const daysAgo = w * 7 + d;
          if (daysAgo >= daysInPeriod) {
            weekCompletions.push(-1); // Out of range
            weekDates.push('');
            continue;
          }
          
          const date = subDays(new Date(), daysAgo);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayOfWeek = date.getDay();
          
          const shouldBeDone = 
            habit.frequency === 'daily' ||
            (habit.frequency === 'weekly' && habit.daysOfWeek?.includes(dayOfWeek)) ||
            (habit.frequency === 'specific_days' && habit.daysOfWeek?.includes(dayOfWeek));
          
          if (!shouldBeDone) {
            weekCompletions.push(-1); // Not scheduled
            weekDates.push(dateStr);
          } else {
            const completions = getHabitCompletionForDate(habit.id, dateStr);
            weekCompletions.push(completions >= habit.timesPerDay ? 1 : 0);
            weekDates.push(dateStr);
          }
        }
        
        weekData.push({ week: w, completions: weekCompletions, dates: weekDates });
      }
      
      return { habit, weekData };
    });
  }, [activeHabits, daysInPeriod, getHabitCompletionForDate]);

  // Top habits by completion rate
  const topHabitsByCompletion = useMemo(() => {
    return activeHabits.map(habit => {
      let scheduled = 0;
      let completed = 0;

      for (let i = 0; i < daysInPeriod; i++) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();

        const shouldBeDone = 
          habit.frequency === 'daily' ||
          (habit.frequency === 'weekly' && habit.daysOfWeek?.includes(dayOfWeek)) ||
          (habit.frequency === 'specific_days' && habit.daysOfWeek?.includes(dayOfWeek));

        if (shouldBeDone) {
          scheduled++;
          const completions = getHabitCompletionForDate(habit.id, dateStr);
          if (completions >= habit.timesPerDay) {
            completed++;
          }
        }
      }

      const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
      return { habit, rate, completed, scheduled };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
  }, [activeHabits, daysInPeriod, getHabitCompletionForDate]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getVariationType = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Habit Filter */}
      <motion.div variants={item} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar hábito:</span>
        <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os hábitos</SelectItem>
            {activeHabits.map(habit => (
              <SelectItem key={habit.id} value={habit.id}>
                {habit.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Summary Stats Cards with Comparisons */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Percent}
          value={`${summaryStats.avgCompletionRate}%`}
          label="Taxa média"
          variation={summaryStats.comparisons ? {
            value: Math.abs(summaryStats.comparisons.rateDiff),
            type: getVariationType(summaryStats.comparisons.rateDiff)
          } : undefined}
        />
        <StatCard
          icon={CheckCircle2}
          value={summaryStats.totalCompleted}
          label="Conclusões"
          variation={summaryStats.comparisons ? {
            value: Math.abs(summaryStats.comparisons.completionsDiff),
            type: getVariationType(summaryStats.comparisons.completionsDiff)
          } : undefined}
        />
        <StatCard
          icon={Flame}
          value={`${summaryStats.currentStreak} dias`}
          label="Melhor sequência"
        />
        <StatCard
          icon={Award}
          value={summaryStats.bestDayOfWeek}
          label={`Melhor dia (${summaryStats.bestDayRate}%)`}
        />
      </motion.div>

      {/* Additional Stats Row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <div className="card-elevated p-3 text-center">
          <p className="text-xl font-bold text-primary">{summaryStats.activeHabitsCount}</p>
          <p className="text-xs text-muted-foreground">Hábitos ativos</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <p className="text-xl font-bold text-status-completed">{summaryStats.worstDayOfWeek}</p>
          <p className="text-xs text-muted-foreground">Pior dia ({summaryStats.worstDayRate}%)</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <p className="text-xl font-bold text-primary">{summaryStats.longestStreak}</p>
          <p className="text-xs text-muted-foreground">Maior sequência</p>
        </div>
      </motion.div>

      {/* Completion Rate Over Time Chart */}
      <motion.div variants={item} className="card-elevated p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Taxa de Conclusão - {periodLabel}
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionRateData}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                width={40}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium text-foreground">{data.rate}%</p>
                        <p className="text-xs text-muted-foreground">
                          {data.completed} de {data.total} concluídos
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRate)"
                strokeWidth={2}
                name="Taxa de conclusão"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Two-column layout for Pie Chart and Top Habits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribution Donut Chart */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Distribuição de Conclusões
          </h3>
          <div className="h-[240px] flex items-center justify-center">
            {distributionData.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      label={false}
                      labelLine={false}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          return (
                            <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
                              <p className="text-sm font-semibold text-foreground">{data.name}</p>
                              <p className="text-xs text-muted-foreground">{data.value} itens</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-2xl font-bold text-foreground">{summaryStats.avgCompletionRate}%</p>
                  <p className="text-[10px] text-muted-foreground">concluídos</p>
                </div>
                {/* Legend below */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5">
                  {distributionData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para o período
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Habits by Completion Rate */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Ranking de Conclusão
          </h3>
          <div className="space-y-2.5">
            {topHabitsByCompletion.map(({ habit, rate, completed, scheduled }, index) => {
              const barColor = rate >= 80 ? 'hsl(142, 76%, 36%)' : rate >= 50 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
              return (
                <div key={habit.id} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                  </div>
                  <Icon3D icon={habit.icon} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate pr-2">{habit.title}</p>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: barColor }}>
                        {rate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${rate}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{completed} de {scheduled} concluídos</p>
                  </div>
                </div>
              );
            })}
            {topHabitsByCompletion.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum hábito ativo
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* GitHub-style Heatmap */}
      <motion.div variants={item} className="card-elevated p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Mapa de Conclusões por Hábito
        </h3>
        
        {/* Day labels */}
        <div className="flex mb-2">
          <div className="w-[100px] sm:w-[140px] flex-shrink-0" />
          <div className="flex gap-0.5 text-[10px] text-muted-foreground overflow-hidden">
            {dayOfWeekShort.map((day, i) => (
              <div key={i} className="w-3 h-3 flex items-center justify-center">
                {day[0]}
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-2 overflow-x-auto">
          {habitHeatmapData.map(({ habit, weekData }) => (
            <div key={habit.id} className="flex items-center gap-2">
              <div className="w-[100px] sm:w-[140px] flex-shrink-0 flex items-center gap-2">
                <Icon3D icon={habit.icon} size="sm" />
                <span className="text-xs text-foreground truncate">{habit.title}</span>
              </div>
              <div className="flex gap-1 overflow-hidden">
                {weekData.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.completions.map((status, di) => (
                      <div
                        key={di}
                        className={cn(
                          "w-3 h-3 rounded-sm transition-colors",
                          status === -1 && "bg-transparent",
                          status === 0 && "bg-muted/30",
                          status === 1 && "bg-emerald-500"
                        )}
                        title={week.dates[di] ? `${format(parseISO(week.dates[di]), 'dd/MM')} - ${status === 1 ? 'Concluído' : status === 0 ? 'Não concluído' : 'Não agendado'}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {habitHeatmapData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum hábito ativo
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <span>Não concluído</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Concluído</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
