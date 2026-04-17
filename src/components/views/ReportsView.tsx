import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { formatCurrency } from '@/types/savedin';
import { ChevronLeft, ChevronRight, ArrowDownRight, Wallet, Tag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { FilterBar, FilterState, defaultFilters, applyFilters, getDateRange } from '@/components/finance/FilterBar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function ReportsView() {
  const { transactions } = useTransactionsData();
  const { categories } = useSavedinCategories();
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters, datePreset: 'all' });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Exclude invoice payments (card + account = payment, not purchase)
  const isInvoicePayment = (t: { card_id?: string | null; account_id?: string | null }) =>
    !!t.card_id && !!t.account_id;

  // Apply FilterBar filters (category, account, card, tag, environment, type, status)
  // Date filtering is handled separately via month selector
  const filteredTxns = useMemo(() => {
    const withoutDate = { ...filters, datePreset: 'all' as const };
    return applyFilters(transactions, withoutDate, categories as any)
      .filter(t => !isInvoicePayment(t));
  }, [transactions, filters, categories]);

  // Filter by selected month
  const isInMonth = (t: { date: string }, m: number, y: number) => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  };

  const monthTxns = useMemo(() =>
    filteredTxns.filter(t => isInMonth(t, selectedMonth, selectedYear)),
  [filteredTxns, selectedMonth, selectedYear]);

  const monthlyIncome = useMemo(() =>
    monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
  [monthTxns]);

  const monthlyExpenses = useMemo(() =>
    monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
  [monthTxns]);

  const netBalance = monthlyIncome - monthlyExpenses;

  const categoryExpenses = useMemo(() => {
    const expenseTxns = monthTxns.filter(t => t.type === 'expense');
    const byCategory: Record<string, { category: any; amount: number }> = {};
    expenseTxns.forEach(t => {
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
  }, [monthTxns]);

  const topCategory = categoryExpenses.length > 0
    ? [...categoryExpenses].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Monthly bars (last 12 months) — computed from filtered transactions
  const monthlyBars = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      while (m <= 0) { m += 12; y--; }
      const mTxns = filteredTxns.filter(t => isInMonth(t, m, y));
      const income = mTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = mTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      data.push({ month: MONTHS[m - 1].substring(0, 3), income, expenses, isCurrent: i === 0 });
    }
    return data;
  }, [selectedMonth, selectedYear, filteredTxns]);

  const maxBarValue = Math.max(...monthlyBars.flatMap(d => [d.income, d.expenses]), 1);

  const topExpenses = useMemo(() =>
    monthTxns
      .filter(t => t.type === 'expense')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10),
  [monthTxns]);

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>

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

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={prevMonth} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/10 transition-colors min-w-[180px]">
              <span className="text-sm font-semibold text-foreground capitalize">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="center">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setSelectedYear(y => y - 1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(i + 1); setMonthPickerOpen(false); }}
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedMonth === i + 1
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
        <button onClick={nextMonth} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Main bar chart */}
      <Card className="relative overflow-hidden">
        <TechGridPattern position="top-right" size={100} opacity={0.06} />
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receitas x Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-2">
            {monthlyBars.map((d, i) => {
              const incHeight = (d.income / maxBarValue) * 100;
              const expHeight = (d.expenses / maxBarValue) * 100;
              return (
                <div key={i} className={`flex-1 min-w-[40px] flex flex-col items-center gap-0.5 ${d.isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                  <div className="flex items-end gap-0.5 h-28 w-full justify-center">
                    <div className="w-[40%] bg-green-500 rounded-t-sm transition-all" style={{ height: `${Math.max(incHeight, 2)}%` }} />
                    <div className="w-[40%] bg-destructive rounded-t-sm transition-all" style={{ height: `${Math.max(expHeight, 2)}%` }} />
                  </div>
                  <span className={`text-[10px] ${d.isCurrent ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{d.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-xs text-muted-foreground">Receitas</span></div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-destructive" /><span className="text-xs text-muted-foreground">Despesas</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Mini stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Total Gasto"
          value={monthlyExpenses}
          icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}
          techGrid={false}
        />
        <StatCard
          title="Fluxo Líquido"
          value={netBalance}
          icon={<Wallet className={`h-4 w-4 ${netBalance >= 0 ? 'text-green-500' : 'text-destructive'}`} />}
          techGrid={false}
        />
        <StatCard
          title="Maior Categoria"
          value={topCategory ? topCategory.category?.name || 'N/A' : 'N/A'}
          isCurrency={false}
          subtitle={topCategory ? formatCurrency(topCategory.amount) : undefined}
          icon={<Tag className="h-4 w-4 text-primary" />}
          techGrid={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa</p>
            ) : (
              <div className="space-y-3">
                {categoryExpenses.sort((a, b) => b.amount - a.amount).map((item, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.category?.bg || '#F5F5F5' }}>
                      <LucideIcon name={item.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: item.category?.color || '#9E9E9E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium truncate">{item.category?.name || 'Sem categoria'}</p>
                        <p className="text-xs font-medium text-destructive">{formatCurrency(item.amount)}</p>
                      </div>
                      <Progress value={item.percentage} className="h-1.5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Maiores Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa</p>
            ) : (
              <div className="space-y-2.5">
                {topExpenses.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 py-0.5">
                    <span className="text-xs text-muted-foreground w-5 text-right font-medium">{i + 1}</span>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                      <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className="text-xs font-bold text-destructive">{formatCurrency(Number(t.amount))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
