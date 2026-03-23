import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { formatCurrency } from '@/types/savedin';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Wallet, Tag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { TechGridPattern } from '@/components/ui/TechGridPattern';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const PERIODS = ['week', 'month', 'year'] as const;
const PERIOD_LABELS = { week: 'Esta Semana', month: 'Este Mês', year: 'Este Ano' };

export function ReportsView() {
  const { transactions, getMonthlyIncome, getMonthlyExpenses, getExpensesByCategory } = useTransactionsData();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<typeof PERIODS[number]>('month');

  const monthlyIncome = getMonthlyIncome(selectedMonth, selectedYear);
  const monthlyExpenses = getMonthlyExpenses(selectedMonth, selectedYear);
  const netBalance = monthlyIncome - monthlyExpenses;
  const categoryExpenses = getExpensesByCategory(selectedMonth, selectedYear);

  // Top category
  const topCategory = categoryExpenses.length > 0
    ? categoryExpenses.sort((a, b) => b.amount - a.amount)[0]
    : null;

  // Monthly bars (last 12 months)
  const monthlyBars = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      while (m <= 0) { m += 12; y--; }
      const income = getMonthlyIncome(m, y);
      const expenses = getMonthlyExpenses(m, y);
      data.push({ month: MONTHS[m - 1].substring(0, 3), income, expenses, isCurrent: i === 0 });
    }
    return data;
  }, [selectedMonth, selectedYear, transactions]);

  const maxBarValue = Math.max(...monthlyBars.flatMap(d => [d.income, d.expenses]), 1);

  // Top expenses
  const topExpenses = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10);
  }, [transactions, selectedMonth, selectedYear]);

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

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <Button key={p} variant={selectedPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod(p)}>
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="text-lg font-semibold min-w-[180px] text-center">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
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
                      <span style={{ color: item.category?.color || '#9E9E9E' }}>●</span>
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
                      <span style={{ color: t.category?.color || '#9E9E9E' }} className="text-[10px]">●</span>
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
