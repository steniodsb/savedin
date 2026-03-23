import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Trophy,
  TrendingUp,
  BarChart3,
  Percent
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
  RadialBarChart,
  RadialBar
} from 'recharts';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/ui/stat-card';
import { Icon3D } from '@/components/ui/icon-picker';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalStatisticsProps {
  periodStartDate: Date;
  periodEndDate: Date;
  daysInPeriod: number;
  periodLabel: string;
  previousPeriodStartDate: Date;
  previousPeriodEndDate: Date;
}

const categoryLabels: Record<string, string> = {
  career: 'Carreira',
  health: 'Saúde',
  finance: 'Finanças',
  learning: 'Aprendizado',
  personal: 'Pessoal',
  relationships: 'Relacionamentos'
};

const categoryColors: Record<string, string> = {
  career: 'hsl(var(--primary))',
  health: 'hsl(142, 76%, 36%)',
  finance: 'hsl(45, 93%, 47%)',
  learning: 'hsl(262, 83%, 58%)',
  personal: 'hsl(25, 95%, 53%)',
  relationships: 'hsl(350, 89%, 60%)'
};

export function GoalStatistics({ 
  periodStartDate, 
  periodEndDate, 
  daysInPeriod, 
  periodLabel,
  previousPeriodStartDate,
  previousPeriodEndDate
}: GoalStatisticsProps) {
  const { goals } = useStore();

  // Filter goals by period
  const periodGoals = useMemo(() => {
    return {
      created: goals.filter(g => {
        if (!g.createdAt) return false;
        const date = parseISO(g.createdAt);
        return isWithinInterval(date, { start: periodStartDate, end: periodEndDate });
      }),
      achieved: goals.filter(g => {
        if (!g.achievedAt) return false;
        const date = parseISO(g.achievedAt);
        return isWithinInterval(date, { start: periodStartDate, end: periodEndDate });
      }),
      active: goals.filter(g => g.status === 'in_progress')
    };
  }, [goals, periodStartDate, periodEndDate]);

  // Previous period goals
  const previousPeriodGoals = useMemo(() => {
    return {
      created: goals.filter(g => {
        if (!g.createdAt) return false;
        const date = parseISO(g.createdAt);
        return isWithinInterval(date, { start: previousPeriodStartDate, end: previousPeriodEndDate });
      }),
      achieved: goals.filter(g => {
        if (!g.achievedAt) return false;
        const date = parseISO(g.achievedAt);
        return isWithinInterval(date, { start: previousPeriodStartDate, end: previousPeriodEndDate });
      })
    };
  }, [goals, previousPeriodStartDate, previousPeriodEndDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const createdCount = periodGoals.created.length;
    const achievedCount = periodGoals.achieved.length;
    const activeCount = periodGoals.active.length;
    
    // Average progress of active goals
    const avgProgress = activeCount > 0 
      ? Math.round(periodGoals.active.reduce((acc, g) => acc + g.progress, 0) / activeCount)
      : 0;

    // Comparisons
    const prevCreatedCount = previousPeriodGoals.created.length;
    const prevAchievedCount = previousPeriodGoals.achieved.length;

    const createdDiff = prevCreatedCount > 0 
      ? Math.round(((createdCount - prevCreatedCount) / prevCreatedCount) * 100)
      : createdCount > 0 ? 100 : 0;
    const achievedDiff = prevAchievedCount > 0 
      ? Math.round(((achievedCount - prevAchievedCount) / prevAchievedCount) * 100)
      : achievedCount > 0 ? 100 : 0;

    return {
      createdCount,
      achievedCount,
      activeCount,
      avgProgress,
      comparisons: {
        createdDiff,
        achievedDiff
      }
    };
  }, [periodGoals, previousPeriodGoals]);

  // Goals by category
  const goalsByCategoryData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    goals.forEach(g => {
      categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
    });

    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: categoryLabels[category] || category,
      value: count,
      fill: categoryColors[category] || 'hsl(var(--primary))'
    }));
  }, [goals]);

  // Goals by status
  const goalsByStatusData = useMemo(() => {
    const statusCounts = {
      not_started: goals.filter(g => g.status === 'not_started').length,
      in_progress: goals.filter(g => g.status === 'in_progress').length,
      achieved: goals.filter(g => g.status === 'achieved').length,
      abandoned: goals.filter(g => g.status === 'abandoned').length,
    };

    return [
      { name: 'Não iniciada', value: statusCounts.not_started, fill: 'hsl(var(--muted-foreground))' },
      { name: 'Em progresso', value: statusCounts.in_progress, fill: 'hsl(var(--primary))' },
      { name: 'Alcançada', value: statusCounts.achieved, fill: 'hsl(142, 76%, 36%)' },
      { name: 'Abandonada', value: statusCounts.abandoned, fill: 'hsl(var(--destructive))' },
    ].filter(item => item.value > 0);
  }, [goals]);

  // Top goals by progress
  const topGoalsByProgress = useMemo(() => {
    return periodGoals.active
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
      .map(g => ({
        goal: g,
        progress: g.progress
      }));
  }, [periodGoals.active]);

  // Goals needing attention (lowest progress)
  const goalsNeedingAttention = useMemo(() => {
    return periodGoals.active
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 3);
  }, [periodGoals.active]);

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
      {/* Summary Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Target}
          value={summaryStats.createdCount}
          label="Metas criadas"
          variation={{
            value: Math.abs(summaryStats.comparisons.createdDiff),
            type: getVariationType(summaryStats.comparisons.createdDiff)
          }}
        />
        <StatCard
          icon={Trophy}
          value={summaryStats.achievedCount}
          label="Metas alcançadas"
          variation={{
            value: Math.abs(summaryStats.comparisons.achievedDiff),
            type: getVariationType(summaryStats.comparisons.achievedDiff)
          }}
        />
        <StatCard
          icon={BarChart3}
          value={summaryStats.activeCount}
          label="Metas ativas"
        />
        <StatCard
          icon={Percent}
          value={`${summaryStats.avgProgress}%`}
          label="Progresso médio"
        />
      </motion.div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Goals by Category */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">Metas por Categoria</h3>
          <div className="h-[200px]">
            {goalsByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={goalsByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {goalsByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend 
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem metas
              </div>
            )}
          </div>
        </motion.div>

        {/* Goals by Status */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">Metas por Status</h3>
          <div className="h-[200px]">
            {goalsByStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={goalsByStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {goalsByStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend 
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem metas
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Goals and Goals Needing Attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Goals by Progress */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Metas com Maior Progresso
          </h3>
          <div className="space-y-3">
            {topGoalsByProgress.map(({ goal, progress }, index) => (
              <div key={goal.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
                <Icon3D icon={goal.icon} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: progress >= 80 ? 'hsl(142, 76%, 36%)' : progress >= 50 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                      }}
                    />
                  </div>
                </div>
                <span 
                  className="text-sm font-bold"
                  style={{ 
                    color: progress >= 80 ? 'hsl(142, 76%, 36%)' : progress >= 50 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {progress}%
                </span>
              </div>
            ))}
            {topGoalsByProgress.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma meta ativa
              </p>
            )}
          </div>
        </motion.div>

        {/* Goals Needing Attention */}
        <motion.div variants={item} className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-destructive" />
            Metas que Precisam de Atenção
          </h3>
          <div className="space-y-3">
            {goalsNeedingAttention.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                <Icon3D icon={goal.icon} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabels[goal.category]}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-destructive">{goal.progress}%</span>
                </div>
              </div>
            ))}
            {goalsNeedingAttention.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma meta precisa de atenção
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
