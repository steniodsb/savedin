import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ListTodo,
  Timer,
  Calendar
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
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import { format, subDays, parseISO, differenceInDays, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskStatisticsProps {
  periodStartDate: Date;
  periodEndDate: Date;
  daysInPeriod: number;
  periodLabel: string;
  previousPeriodStartDate: Date;
  previousPeriodEndDate: Date;
}

const dayOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function TaskStatistics({ 
  periodStartDate, 
  periodEndDate, 
  daysInPeriod, 
  periodLabel,
  previousPeriodStartDate,
  previousPeriodEndDate
}: TaskStatisticsProps) {
  const { tasks } = useStore();

  // Filter tasks by period
  const periodTasks = useMemo(() => {
    return {
      created: tasks.filter(t => {
        if (!t.createdAt) return false;
        const date = parseISO(t.createdAt);
        return isWithinInterval(date, { start: periodStartDate, end: periodEndDate });
      }),
      completed: tasks.filter(t => {
        if (!t.completedAt) return false;
        const date = parseISO(t.completedAt);
        return isWithinInterval(date, { start: periodStartDate, end: periodEndDate });
      }),
      overdue: tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = parseISO(t.dueDate);
        return isBefore(dueDate, new Date()) && 
               isWithinInterval(dueDate, { start: periodStartDate, end: periodEndDate });
      })
    };
  }, [tasks, periodStartDate, periodEndDate]);

  // Previous period tasks for comparison
  const previousPeriodTasks = useMemo(() => {
    return {
      created: tasks.filter(t => {
        if (!t.createdAt) return false;
        const date = parseISO(t.createdAt);
        return isWithinInterval(date, { start: previousPeriodStartDate, end: previousPeriodEndDate });
      }),
      completed: tasks.filter(t => {
        if (!t.completedAt) return false;
        const date = parseISO(t.completedAt);
        return isWithinInterval(date, { start: previousPeriodStartDate, end: previousPeriodEndDate });
      })
    };
  }, [tasks, previousPeriodStartDate, previousPeriodEndDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const createdCount = periodTasks.created.length;
    const completedCount = periodTasks.completed.length;
    const overdueCount = periodTasks.overdue.length;
    const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;

    // Average time to complete (in days)
    let totalCompletionTime = 0;
    let completedWithTime = 0;
    periodTasks.completed.forEach(t => {
      if (t.createdAt && t.completedAt) {
        const days = differenceInDays(parseISO(t.completedAt), parseISO(t.createdAt));
        totalCompletionTime += days;
        completedWithTime++;
      }
    });
    const avgCompletionTime = completedWithTime > 0 ? Math.round(totalCompletionTime / completedWithTime) : 0;

    // Best day of week for completing tasks
    const dayCompletions: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    periodTasks.completed.forEach(t => {
      if (t.completedAt) {
        const day = parseISO(t.completedAt).getDay();
        dayCompletions[day]++;
      }
    });
    const bestDayIndex = Object.entries(dayCompletions).reduce((a, b) => 
      b[1] > dayCompletions[parseInt(a[0])] ? b : a
    )[0];

    // Comparisons with previous period
    const prevCreatedCount = previousPeriodTasks.created.length;
    const prevCompletedCount = previousPeriodTasks.completed.length;
    const prevCompletionRate = prevCreatedCount > 0 ? Math.round((prevCompletedCount / prevCreatedCount) * 100) : 0;

    const createdDiff = prevCreatedCount > 0 
      ? Math.round(((createdCount - prevCreatedCount) / prevCreatedCount) * 100)
      : createdCount > 0 ? 100 : 0;
    const completedDiff = prevCompletedCount > 0 
      ? Math.round(((completedCount - prevCompletedCount) / prevCompletedCount) * 100)
      : completedCount > 0 ? 100 : 0;
    const rateDiff = completionRate - prevCompletionRate;

    return {
      createdCount,
      completedCount,
      overdueCount,
      completionRate,
      avgCompletionTime,
      bestDayOfWeek: dayOfWeekNames[parseInt(bestDayIndex)],
      comparisons: {
        createdDiff,
        completedDiff,
        rateDiff
      }
    };
  }, [periodTasks, previousPeriodTasks]);

  // Completion rate over time
  const completionRateData = useMemo(() => {
    const data: { date: string; name: string; completed: number; created: number }[] = [];
    const interval = daysInPeriod > 60 ? 7 : daysInPeriod > 30 ? 3 : 1;
    
    for (let i = daysInPeriod - 1; i >= 0; i -= interval) {
      const endDate = subDays(periodEndDate, i);
      const startDate = subDays(endDate, interval - 1);
      
      let completed = 0;
      let created = 0;
      
      tasks.forEach(t => {
        if (t.createdAt) {
          const createdDate = parseISO(t.createdAt);
          if (isWithinInterval(createdDate, { start: startDate, end: endDate })) {
            created++;
          }
        }
        if (t.completedAt) {
          const completedDate = parseISO(t.completedAt);
          if (isWithinInterval(completedDate, { start: startDate, end: endDate })) {
            completed++;
          }
        }
      });

      data.push({
        date: format(endDate, 'yyyy-MM-dd'),
        name: format(endDate, daysInPeriod > 30 ? 'dd/MM' : 'dd'),
        completed,
        created
      });
    }

    return data;
  }, [tasks, periodEndDate, daysInPeriod]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };

    return [
      { name: 'Pendente', value: statusCounts.pending, fill: 'hsl(var(--muted-foreground))' },
      { name: 'Em Progresso', value: statusCounts.in_progress, fill: 'hsl(var(--primary))' },
      { name: 'Bloqueado', value: statusCounts.blocked, fill: 'hsl(var(--destructive))' },
      { name: 'Concluído', value: statusCounts.completed, fill: 'hsl(142, 76%, 36%)' },
    ].filter(item => item.value > 0);
  }, [tasks]);

  // Priority distribution
  const priorityDistribution = useMemo(() => {
    const priorityCounts = {
      urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
      high: tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
      medium: tasks.filter(t => t.priority === 'medium' && t.status !== 'completed').length,
      low: tasks.filter(t => t.priority === 'low' && t.status !== 'completed').length,
    };

    return [
      { name: 'Urgente', value: priorityCounts.urgent, fill: 'hsl(var(--destructive))' },
      { name: 'Alta', value: priorityCounts.high, fill: 'hsl(25, 95%, 53%)' },
      { name: 'Média', value: priorityCounts.medium, fill: 'hsl(var(--primary))' },
      { name: 'Baixa', value: priorityCounts.low, fill: 'hsl(142, 76%, 36%)' },
    ].filter(item => item.value > 0);
  }, [tasks]);

  const getVariationType = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Summary Stats Cards with Comparisons */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={ListTodo}
          value={summaryStats.createdCount}
          label="Tarefas criadas"
          variation={{
            value: Math.abs(summaryStats.comparisons.createdDiff),
            type: getVariationType(summaryStats.comparisons.createdDiff)
          }}
        />
        <StatCard
          icon={CheckCircle2}
          value={summaryStats.completedCount}
          label="Concluídas"
          variation={{
            value: Math.abs(summaryStats.comparisons.completedDiff),
            type: getVariationType(summaryStats.comparisons.completedDiff)
          }}
        />
        <StatCard
          icon={TrendingUp}
          value={`${summaryStats.completionRate}%`}
          label="Taxa de conclusão"
          variation={{
            value: Math.abs(summaryStats.comparisons.rateDiff),
            type: getVariationType(summaryStats.comparisons.rateDiff)
          }}
        />
        <StatCard
          icon={AlertTriangle}
          value={summaryStats.overdueCount}
          label="Atrasadas"
        />
      </motion.div>

      {/* Additional Stats */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">
              {summaryStats.avgCompletionTime} {summaryStats.avgCompletionTime === 1 ? 'dia' : 'dias'}
            </p>
            <p className="text-xs text-muted-foreground">Tempo médio para conclusão</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{summaryStats.bestDayOfWeek}</p>
            <p className="text-xs text-muted-foreground">Dia mais produtivo</p>
          </div>
        </div>
      </motion.div>

      {/* Completion Over Time Chart */}
      <motion.div variants={item} className="card-elevated p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Tarefas ao Longo do Tempo - {periodLabel}
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionRateData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
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
                width={30}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium text-foreground">
                          Criadas: {data.created}
                        </p>
                        <p className="text-sm font-medium text-status-completed">
                          Concluídas: {data.completed}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorCreated)"
                strokeWidth={2}
                name="Criadas"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="hsl(142, 76%, 36%)"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                strokeWidth={2}
                name="Concluídas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">Distribuição por Status</h3>
          <div className="h-[240px] flex items-center justify-center">
            {statusDistribution.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusDistribution}
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
                      {statusDistribution.map((entry, index) => (
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
                              <p className="text-xs text-muted-foreground">{data.value} tarefas</p>
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
                  <p className="text-2xl font-bold text-foreground">
                    {statusDistribution.reduce((acc, d) => acc + d.value, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">tarefas</p>
                </div>
                {/* Legend below */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {statusDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem tarefas
              </div>
            )}
          </div>
        </motion.div>

        {/* Priority Distribution */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">Tarefas Pendentes por Prioridade</h3>
          <div className="h-[200px]">
            {priorityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem tarefas pendentes
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
