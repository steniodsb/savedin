import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { useFinancialGoalsData } from '@/hooks/useFinancialGoalsData';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/types/savedin';
import { useUIStore } from '@/store/useUIStore';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { Wallet, ArrowUpRight, ArrowDownRight, Flag, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { LucideIcon } from '@/components/ui/LucideIcon';

export function DashboardView() {
  const { user } = useAuth();
  const { totalBalance, accounts } = useAccountsData();
  const { transactions, getMonthlyIncome, getMonthlyExpenses, getExpensesByCategory } = useTransactionsData();
  const { creditCards, invoices } = useCreditCardsData();
  const { budgets, getBudgetsForMonth } = useBudgetsData();
  const { activeGoals, totalSaved, totalTarget } = useFinancialGoalsData();
  const { setActiveTab, selectedEnvironmentId } = useUIStore();
  const { environments } = useEnvironmentsData();
  const selectedEnv = environments.find(e => e.id === selectedEnvironmentId);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).single().then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user?.id]);

  const monthlyIncome = getMonthlyIncome(currentMonth, currentYear);
  const monthlyExpenses = getMonthlyExpenses(currentMonth, currentYear);
  const netBalance = monthlyIncome - monthlyExpenses;

  // Last month for variation
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const lastMonthIncome = getMonthlyIncome(lastMonth, lastMonthYear);
  const lastMonthExpenses = getMonthlyExpenses(lastMonth, lastMonthYear);

  const incomeVariation = lastMonthIncome > 0 ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
  const expenseVariation = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
  const balanceVariation = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

  // Goals progress
  const goalsProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const categoryExpenses = getExpensesByCategory(currentMonth, currentYear);

  // Cash flow sparkline (last 6 months)
  const cashFlowData = useMemo(() => {
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) { m += 12; y--; }
      incomeData.push(getMonthlyIncome(m, y));
      expenseData.push(getMonthlyExpenses(m, y));
    }
    return { incomeData, expenseData };
  }, [currentMonth, currentYear, transactions]);

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const cashFlowMonths = useMemo(() => {
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      while (m <= 0) m += 12;
      labels.push(MONTHS[m - 1]);
    }
    return labels;
  }, [currentMonth]);

  const maxCashFlow = Math.max(...cashFlowData.incomeData, ...cashFlowData.expenseData, 1);

  // Recent transactions (last 5)
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Current budgets
  const currentBudgets = useMemo(() => {
    const monthBudgets = getBudgetsForMonth(currentMonth, currentYear);
    return monthBudgets.map(budget => {
      const spent = transactions
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && t.category_id === budget.category_id &&
            d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions, currentMonth, currentYear]);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatDateHeader = () => now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{formatDateHeader()}</p>
        </div>
        {selectedEnv ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/30">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedEnv.color }} />
            <span className="text-xs font-medium">{selectedEnv.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/30">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Todos</span>
          </div>
        )}
      </div>

      {/* ═══ Row 1: 4 Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Saldo Total"
          value={totalBalance}
          variation={balanceVariation !== 0 ? -balanceVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center"><Wallet className="h-4 w-4 text-white" /></div>}
          linkText="ver detalhes"
          onLinkClick={() => setActiveTab('accounts')}
        />
        <StatCard
          title="Receitas"
          value={monthlyIncome}
          variation={incomeVariation !== 0 ? incomeVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-green-500" /></div>}
          linkText="ver detalhes"
          onLinkClick={() => setActiveTab('transactions')}
        />
        <StatCard
          title="Despesas"
          value={monthlyExpenses}
          variation={expenseVariation !== 0 ? -expenseVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-destructive" /></div>}
          linkText="ver detalhes"
          onLinkClick={() => setActiveTab('transactions')}
        />
        <StatCard
          title="Objetivos"
          value={`${goalsProgress}% concluído`}
          isCurrency={false}
          subtitle={activeGoals.length > 0 ? `${activeGoals.length} em andamento` : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Flag className="h-4 w-4 text-amber-500" /></div>}
          linkText="ver objetivos"
          onLinkClick={() => setActiveTab('goals')}
          techGrid={false}
        />
      </div>

      {/* ═══ Row 2: Cash Flow + Category Donut ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart — 2/3 */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <TechGridPattern position="top-right" size={100} opacity={0.06} />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashFlowMonths.map((month, i) => (
                <div key={month} className="grid grid-cols-[40px_1fr] gap-3 items-center">
                  <span className="text-xs text-muted-foreground text-right">{month}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/30 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(cashFlowData.incomeData[i] / maxCashFlow) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-green-500 w-16 text-right font-medium">{formatCurrency(cashFlowData.incomeData[i])}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/30 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${(cashFlowData.expenseData[i] / maxCashFlow) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-destructive w-16 text-right font-medium">{formatCurrency(cashFlowData.expenseData[i])}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-xs text-muted-foreground">Receitas</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-destructive" /><span className="text-xs text-muted-foreground">Despesas</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Category Donut — 1/3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa este mês</p>
            ) : (
              <div className="space-y-3">
                {categoryExpenses.sort((a, b) => b.amount - a.amount).slice(0, 7).map((item, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.category?.bg || '#F5F5F5' }}>
                      <LucideIcon name={item.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: item.category?.color || '#9E9E9E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium truncate">{item.category?.name || 'Sem categoria'}</p>
                        <p className="text-xs font-medium text-destructive ml-2">{formatCurrency(item.amount)}</p>
                      </div>
                      <Progress value={item.percentage} className="h-1" />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Row 3: Recent Transactions + Goals ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transações Recentes</CardTitle>
              <button onClick={() => setActiveTab('transactions')} className="text-xs text-primary hover:underline">Ver todas</button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação ainda</p>
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-1">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                      <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}{t.account?.name && ` · ${t.account.name}`}</p>
                    </div>
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals — 1/3 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Objetivos</CardTitle>
              <button onClick={() => setActiveTab('goals')} className="text-xs text-primary hover:underline">Ver todos</button>
            </div>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum objetivo ativo</p>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 4).map((goal) => {
                  const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;
                  return (
                    <div key={goal.id} className="p-3 rounded-xl bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{goal.icon}</span>
                        <p className="text-sm font-medium truncate flex-1">{goal.name}</p>
                        <span className="text-xs font-medium text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{formatCurrency(Number(goal.current_amount))}</span>
                        <span className="text-[10px] text-muted-foreground">{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Budget Progress (conditional) ═══ */}
      {currentBudgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orçamentos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentBudgets.map((budget) => {
                const percentage = budget.monthly_limit > 0 ? (budget.spent / Number(budget.monthly_limit)) * 100 : 0;
                const isOver = percentage > 100;
                return (
                  <div key={budget.id} className="p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{budget.category?.name || 'Geral'}</span>
                      <span className={`text-xs font-medium ${isOver ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className={`h-2 ${isOver ? '[&>div]:bg-destructive' : ''}`} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{formatCurrency(budget.spent)}</span>
                      <span className="text-[10px] text-muted-foreground">{formatCurrency(Number(budget.monthly_limit))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
