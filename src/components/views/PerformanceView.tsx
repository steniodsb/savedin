import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useFinancialGoalsData } from '@/hooks/useFinancialGoalsData';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { formatCurrency } from '@/types/savedin';
import { TrendingUp, TrendingDown, Target, Wallet, Award, Flame, PiggyBank, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { TechGridPattern } from '@/components/ui/TechGridPattern';

export function PerformanceView() {
  const { transactions, getMonthlyIncome, getMonthlyExpenses } = useTransactionsData();
  const { totalBalance } = useAccountsData();
  const { activeGoals, completedGoals, totalSaved, totalTarget } = useFinancialGoalsData();
  const { getBudgetsForMonth } = useBudgetsData();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Monthly data for the last 6 months
  const monthlyData = useMemo(() => {
    const data: { month: string; income: number; expenses: number; savings: number }[] = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) { m += 12; y--; }
      const income = getMonthlyIncome(m, y);
      const expenses = getMonthlyExpenses(m, y);
      data.push({ month: months[m - 1], income, expenses, savings: income - expenses });
    }
    return data;
  }, [currentMonth, currentYear, transactions]);

  const currentIncome = getMonthlyIncome(currentMonth, currentYear);
  const currentExpenses = getMonthlyExpenses(currentMonth, currentYear);
  const currentSavings = currentIncome - currentExpenses;
  const savingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;

  // Average expenses (last 6 months)
  const avgExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0) / Math.max(monthlyData.filter(d => d.expenses > 0).length, 1);
  const avgIncome = monthlyData.reduce((s, d) => s + d.income, 0) / Math.max(monthlyData.filter(d => d.income > 0).length, 1);

  // Savings trend
  const savingsTrend = monthlyData.map(d => d.savings);

  // Budget compliance
  const monthBudgets = getBudgetsForMonth(currentMonth, currentYear);
  const budgetCompliance = monthBudgets.length > 0
    ? (monthBudgets.filter(b => {
        const spent = transactions
          .filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && t.category_id === b.category_id &&
              d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return spent <= Number(b.monthly_limit);
      }).length / monthBudgets.length) * 100
    : 100;

  // Goals progress
  const goalsProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Streaks — consecutive months of positive savings
  const savingsStreak = useMemo(() => {
    let streak = 0;
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].savings > 0) streak++;
      else break;
    }
    return streak;
  }, [monthlyData]);

  // Score calculation (0-100)
  const score = useMemo(() => {
    let s = 0;
    if (savingsRate > 20) s += 30; else if (savingsRate > 10) s += 20; else if (savingsRate > 0) s += 10;
    s += Math.min(budgetCompliance * 0.3, 30);
    s += Math.min(goalsProgress * 0.2, 20);
    s += Math.min(savingsStreak * 5, 20);
    return Math.round(Math.min(s, 100));
  }, [savingsRate, budgetCompliance, goalsProgress, savingsStreak]);

  const scoreColor = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-destructive';
  const scoreLabel = score >= 70 ? 'Excelente' : score >= 40 ? 'Regular' : 'Precisa Melhorar';

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-foreground">Meu Desempenho</h1>

      {/* Score Card */}
      <Card className="relative overflow-hidden">
        <TechGridPattern position="top-right" size={140} opacity={0.1} />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className={scoreColor}
                  strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`}
                  strokeDashoffset="66" strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-[10px] text-muted-foreground">pontos</span>
              </div>
            </div>
            <div>
              <p className={`text-lg font-bold ${scoreColor}`}>{scoreLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">Baseado em taxa de poupança, orçamento e metas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Taxa de Poupança" value={`${savingsRate.toFixed(1)}%`} isCurrency={false}
          subtitle={currentSavings >= 0 ? 'Positiva' : 'Negativa'} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center"><PiggyBank className="h-4 w-4 text-green-500" /></div>}
        />
        <StatCard title="Sequência de Poupança" value={`${savingsStreak} meses`} isCurrency={false} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Flame className="h-4 w-4 text-amber-500" /></div>}
        />
        <StatCard title="Orçamento" value={`${budgetCompliance.toFixed(0)}% ok`} isCurrency={false} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="h-4 w-4 text-primary" /></div>}
        />
        <StatCard title="Metas" value={`${goalsProgress.toFixed(0)}%`} isCurrency={false}
          subtitle={`${completedGoals.length} concluídas`} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center"><Award className="h-4 w-4 text-purple-500" /></div>}
        />
      </div>

      {/* Savings Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendência de Poupança</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-4">
            <SparklineChart data={savingsTrend} width={300} height={60} strokeWidth={2} />
          </div>
          <div className="grid grid-cols-6 gap-2">
            {monthlyData.map((d, i) => (
              <div key={i} className="text-center">
                <p className={`text-xs font-bold ${d.savings >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {d.savings >= 0 ? '+' : ''}{formatCurrency(d.savings)}
                </p>
                <p className="text-[10px] text-muted-foreground">{d.month}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Média Mensal (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Receita média</span>
                </div>
                <span className="text-sm font-bold text-green-500">{formatCurrency(avgIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Despesa média</span>
                </div>
                <span className="text-sm font-bold text-destructive">{formatCurrency(avgExpenses)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Poupança média</span>
                </div>
                <span className={`text-sm font-bold ${avgIncome - avgExpenses >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {formatCurrency(avgIncome - avgExpenses)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savingsRate < 10 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Taxa de poupança baixa</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tente poupar pelo menos 10-20% da sua renda mensal.</p>
                  </div>
                </div>
              )}
              {savingsRate >= 20 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                  <Award className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-500">Excelente poupança!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Você está poupando mais de 20%. Continue assim!</p>
                  </div>
                </div>
              )}
              {budgetCompliance < 80 && monthBudgets.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <Target className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">Orçamentos estourados</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Revise os limites de orçamento por categoria.</p>
                  </div>
                </div>
              )}
              {activeGoals.length === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Defina objetivos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Crie metas financeiras para ter mais foco.</p>
                  </div>
                </div>
              )}
              {savingsStreak >= 3 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <Flame className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">Sequência de {savingsStreak} meses!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Você tem poupado por {savingsStreak} meses consecutivos.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
