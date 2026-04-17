import { useMemo, useState, useEffect } from 'react';
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
import { Wallet, ArrowUpRight, ArrowDownRight, Flag, Globe, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { FilterBar, FilterState, defaultFilters, applyFilters } from '@/components/finance/FilterBar';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import { getInvoiceMonthYear, getCurrentInvoiceMonthYear } from '@/utils/invoiceUtils';

export function DashboardView() {
  const { user } = useAuth();
  const { totalBalance, accounts } = useAccountsData();
  const { transactions, getMonthlyIncome, getMonthlyExpenses, getExpensesByCategory } = useTransactionsData();
  const { creditCards, invoices } = useCreditCardsData();
  const { budgets, getBudgetsForMonth } = useBudgetsData();
  const { activeGoals, totalSaved, totalTarget } = useFinancialGoalsData();
  const { setActiveTab, selectedEnvironmentId, viewMode, setPendingTransactionFilter } = useUIStore();
  const { environments } = useEnvironmentsData();
  const selectedEnv = environments.find(e => e.id === selectedEnvironmentId);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const currentMonth = viewMonth;
  const currentYear = viewYear;

  const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Apply filters to transactions
  const filteredTxns = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).single().then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user?.id]);

  // Invoice payments (card_id + account_id) are transfers, not real expenses — exclude from totals to avoid double counting
  const isInvoicePayment = (t: { card_id?: string | null; account_id?: string | null }) =>
    !!t.card_id && !!t.account_id;

  // Returns the effective month/year for a transaction depending on view mode
  const getEffectiveMonth = (t: { date: string; card_id?: string | null; credit_card?: { closing_day: number } | null }) => {
    if (viewMode === 'caixa' && t.card_id && t.credit_card?.closing_day) {
      return getInvoiceMonthYear(t.date, t.credit_card.closing_day);
    }
    const d = new Date(t.date);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  };

  const isInMonth = (t: { date: string; card_id?: string | null; credit_card?: { closing_day: number } | null }, month: number, year: number) => {
    const eff = getEffectiveMonth(t);
    return eff.month === month && eff.year === year;
  };

  // Compute income/expenses from filtered transactions (excluding invoice payments)
  const monthlyIncome = useMemo(() =>
    filteredTxns.filter(t => t.type === 'income' && isInMonth(t, currentMonth, currentYear))
      .reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, currentMonth, currentYear, viewMode]);

  const monthlyExpenses = useMemo(() =>
    filteredTxns.filter(t => {
      if (isInvoicePayment(t)) return false;
      return t.type === 'expense' && isInMonth(t, currentMonth, currentYear);
    }).reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, currentMonth, currentYear, viewMode]);

  const netBalance = monthlyIncome - monthlyExpenses;

  // Paid non-card expenses
  const paidNonCardExpenses = useMemo(() =>
    filteredTxns.filter(t => {
      if (isInvoicePayment(t)) return false;
      if (t.card_id && !t.account_id) return false; // card purchases handled separately
      return t.type === 'expense' && t.status === 'paid' && isInMonth(t, currentMonth, currentYear);
    }).reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, currentMonth, currentYear, viewMode]);

  // Pending non-card expenses
  const pendingNonCardExpenses = useMemo(() =>
    filteredTxns.filter(t => {
      if (isInvoicePayment(t)) return false;
      if (t.card_id && !t.account_id) return false; // card purchases handled separately
      return t.type === 'expense' && t.status === 'pending' && isInMonth(t, currentMonth, currentYear);
    }).reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, currentMonth, currentYear, viewMode]);

  // Card transactions in the current view month, grouped by card
  const cardTotalsByCard = useMemo(() => {
    const result: Record<string, { total: number; invoiceMonth: number; invoiceYear: number }> = {};
    creditCards.forEach(card => {
      const cardTxns = filteredTxns
        .filter(t => t.card_id === card.id && t.type === 'expense' && !t.account_id)
        .filter(t => isInMonth(t, currentMonth, currentYear));
      const total = cardTxns.reduce((sum, t) => sum + Number(t.amount), 0);
      if (total > 0) {
        // Determine which invoice these transactions belong to (for paid/unpaid check)
        // Use the first transaction to find the invoice month
        const sampleTxn = cardTxns[0];
        const inv = sampleTxn ? getInvoiceMonthYear(sampleTxn.date, card.closing_day) : { month: currentMonth, year: currentYear };
        result[card.id] = { total, invoiceMonth: inv.month, invoiceYear: inv.year };
      }
    });
    return result;
  }, [filteredTxns, creditCards, currentMonth, currentYear, viewMode]);

  // Unpaid card invoices for the selected month
  const pendingInvoiceTotal = useMemo(() => {
    let total = 0;
    Object.entries(cardTotalsByCard).forEach(([cardId, { total: cardTotal, invoiceMonth, invoiceYear }]) => {
      const inv = invoices.find(i => i.card_id === cardId && i.month === invoiceMonth && i.year === invoiceYear);
      if (inv?.status !== 'paid') {
        total += cardTotal;
      }
    });
    return total;
  }, [cardTotalsByCard, invoices]);

  // Paid card invoices for the selected month
  const paidInvoiceTotal = useMemo(() => {
    let total = 0;
    Object.entries(cardTotalsByCard).forEach(([cardId, { total: cardTotal, invoiceMonth, invoiceYear }]) => {
      const inv = invoices.find(i => i.card_id === cardId && i.month === invoiceMonth && i.year === invoiceYear);
      if (inv?.status === 'paid') {
        total += cardTotal;
      }
    });
    return total;
  }, [cardTotalsByCard, invoices]);

  const paidExpenses = paidNonCardExpenses + paidInvoiceTotal;
  const pendingExpenses = pendingNonCardExpenses + pendingInvoiceTotal;

  // Last month for variation (using same viewMode-aware logic)
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const lastMonthIncome = useMemo(() =>
    filteredTxns.filter(t => t.type === 'income' && isInMonth(t, lastMonth, lastMonthYear))
      .reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, lastMonth, lastMonthYear, viewMode]);

  const lastMonthExpenses = useMemo(() =>
    filteredTxns.filter(t => {
      if (isInvoicePayment(t)) return false;
      return t.type === 'expense' && isInMonth(t, lastMonth, lastMonthYear);
    }).reduce((sum, t) => sum + Number(t.amount), 0),
  [filteredTxns, lastMonth, lastMonthYear, viewMode]);

  const incomeVariation = lastMonthIncome > 0 ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
  const expenseVariation = lastMonthExpenses > 0 ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
  const lastNetBalance = lastMonthIncome - lastMonthExpenses;
  const balanceVariation = lastNetBalance !== 0 ? ((netBalance - lastNetBalance) / Math.abs(lastNetBalance)) * 100 : 0;

  // Goals progress
  const goalsProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Category expenses from filtered transactions (excluding invoice payments)
  const categoryExpenses = useMemo(() => {
    const monthTxns = filteredTxns.filter(t => {
      if (isInvoicePayment(t)) return false;
      return t.type === 'expense' && isInMonth(t, currentMonth, currentYear);
    });
    const byCategory: Record<string, { category: any; amount: number }> = {};
    monthTxns.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      if (!byCategory[catId]) {
        byCategory[catId] = { category: t.category, amount: 0 };
      }
      byCategory[catId].amount += Number(t.amount);
    });
    const total = Object.values(byCategory).reduce((s, v) => s + v.amount, 0);
    return Object.values(byCategory).map(v => ({
      ...v,
      percentage: total > 0 ? (v.amount / total) * 100 : 0,
    }));
  }, [filteredTxns, currentMonth, currentYear]);

  // Cash flow sparkline (last 6 months)
  const cashFlowData = useMemo(() => {
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) { m += 12; y--; }
      const mIncome = filteredTxns
        .filter(t => t.type === 'income' && isInMonth(t, m, y))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const mExpense = filteredTxns
        .filter(t => t.type === 'expense' && !isInvoicePayment(t) && isInMonth(t, m, y))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      incomeData.push(mIncome);
      expenseData.push(mExpense);
    }
    return { incomeData, expenseData };
  }, [currentMonth, currentYear, filteredTxns, viewMode]);

  const cashFlowMonths = useMemo(() => {
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      while (m <= 0) m += 12;
      labels.push(MONTHS_SHORT[m - 1]);
    }
    return labels;
  }, [currentMonth]);

  const maxCashFlow = Math.max(...cashFlowData.incomeData, ...cashFlowData.expenseData, 1);

  // Recent transactions (last 5, excluding invoice payments)
  const recentTransactions = useMemo(() => filteredTxns.filter(t => !isInvoicePayment(t)).slice(0, 5), [filteredTxns]);

  // Current budgets
  const currentBudgets = useMemo(() => {
    const monthBudgets = getBudgetsForMonth(currentMonth, currentYear);
    return monthBudgets.map(budget => {
      const spent = filteredTxns
        .filter(t => {
          if (isInvoicePayment(t)) return false;
          return t.type === 'expense' && t.category_id === budget.category_id &&
            isInMonth(t, currentMonth, currentYear);
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...budget, spent };
    });
  }, [budgets, filteredTxns, currentMonth, currentYear]);

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
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">
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

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={goToPrevMonth} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/10 transition-colors min-w-[180px]">
              <span className="text-sm font-semibold text-foreground capitalize">
                {MONTHS_FULL[viewMonth - 1]} {viewYear}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="center">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setViewYear(y => y - 1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold">{viewYear}</span>
              <button onClick={() => setViewYear(y => y + 1)} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setViewMonth(i + 1); setMonthPickerOpen(false); }}
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                    viewMonth === i + 1
                      ? 'gradient-bg text-white'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button onClick={goToNextMonth} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* View mode toggle + Filters */}
      <div className="flex items-center justify-between gap-2">
        <ViewModeToggle />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          showDate={false}
          showType
          showCategory
          showAccount
          showCard
          showTag
          showEnvironment
          showStatus
        />
      </div>

      {/* ═══ Row 1: 4 Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Saldo do Mês"
          value={netBalance}
          variation={balanceVariation !== 0 ? balanceVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center"><Wallet className="h-4 w-4 text-white" /></div>}
          linkText="ver detalhes"
          onClick={() => { setPendingTransactionFilter(null); setActiveTab('transactions'); }}
        />
        <StatCard
          title="Receitas"
          value={monthlyIncome}
          variation={incomeVariation !== 0 ? incomeVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-green-500" /></div>}
          linkText="ver detalhes"
          onClick={() => { setPendingTransactionFilter({ type: 'income' }); setActiveTab('transactions'); }}
        />
        <StatCard
          title="Despesas"
          value={monthlyExpenses}
          variation={expenseVariation !== 0 ? -expenseVariation : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-destructive" /></div>}
          linkText="ver detalhes"
          onClick={() => { setPendingTransactionFilter({ type: 'expense' }); setActiveTab('transactions'); }}
        />
        <StatCard
          title="Objetivos"
          value={`${goalsProgress}% concluído`}
          isCurrency={false}
          subtitle={activeGoals.length > 0 ? `${activeGoals.length} em andamento` : undefined}
          icon={<div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Flag className="h-4 w-4 text-amber-500" /></div>}
          linkText="ver objetivos"
          onClick={() => setActiveTab('goals')}
          techGrid={false}
        />
      </div>

      {/* ═══ Paid / Pending ═══ */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <StatCard
          title="Despesas Pagas"
          value={paidExpenses}
          icon={<div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-500" /></div>}
          linkText="ver detalhes"
          onClick={() => { setPendingTransactionFilter({ type: 'expense', status: 'paid' }); setActiveTab('transactions'); }}
          techGrid={false}
        />
        <StatCard
          title="Despesas Pendentes"
          value={pendingExpenses}
          icon={<div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-500" /></div>}
          linkText="ver detalhes"
          onClick={() => { setPendingTransactionFilter({ type: 'expense', status: 'pending' }); setActiveTab('transactions'); }}
          techGrid={false}
        />
      </div>

      {/* ═══ Row 2: Cash Flow + Category Donut ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}{t.credit_card?.name ? ` · 💳 ${t.credit_card.name}` : t.account?.name ? ` · ${t.account.name}` : ''}</p>
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
