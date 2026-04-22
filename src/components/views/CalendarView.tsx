import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { formatCurrency } from '@/types/savedin';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { FilterBar, FilterState, defaultFilters, applyFilters } from '@/components/finance/FilterBar';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarView() {
  const { transactions } = useTransactionsData();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Date filtering handled by calendar month selector, not FilterBar preset
  const filteredTransactions = useMemo(
    () => applyFilters(transactions, { ...filters, datePreset: 'all' as const }),
    [transactions, filters]
  );

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [selectedMonth, selectedYear]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach(t => {
      const d = new Date(t.date + 'T12:00:00');
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        const key = t.date;
        if (!totals[key]) totals[key] = { income: 0, expense: 0 };
        if (t.type === 'income') totals[key].income += Number(t.amount);
        else if (t.type === 'expense') totals[key].expense += Number(t.amount);
      }
    });
    return totals;
  }, [filteredTransactions, selectedMonth, selectedYear]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTransactions.filter(t => t.date === selectedDate);
  }, [filteredTransactions, selectedDate]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
    setSelectedDate(null);
  };

  const getDateStr = (day: number) => {
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-foreground">Calendário</h1>

      <FilterBar filters={filters} onChange={setFilters} showCategory showAccount showDate={false} />

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="text-lg font-semibold min-w-[200px] text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = getDateStr(day);
              const totals = dayTotals[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasTransactions = !!totals;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all text-sm
                    ${isSelected ? 'gradient-bg text-white' : isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50'}
                  `}
                >
                  <span className={isSelected ? 'font-bold' : ''}>{day}</span>
                  {hasTransactions && !isSelected && (
                    <div className="flex gap-0.5 mt-0.5">
                      {totals.income > 0 && <div className="h-1 w-1 rounded-full bg-green-500" />}
                      {totals.expense > 0 && <div className="h-1 w-1 rounded-full bg-destructive" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-xs text-muted-foreground">Receita</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-destructive" /><span className="text-xs text-muted-foreground">Despesa</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-primary/10 border border-primary/30" /><span className="text-xs text-muted-foreground">Hoje</span></div>
      </div>

      {selectedDate && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedDayTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação neste dia</p>
            ) : (
              <>
                <div className="flex gap-4 mb-4">
                  {dayTotals[selectedDate]?.income > 0 && (
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">{formatCurrency(dayTotals[selectedDate].income)}</span>
                    </div>
                  )}
                  {dayTotals[selectedDate]?.expense > 0 && (
                    <div className="flex items-center gap-1.5">
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">{formatCurrency(dayTotals[selectedDate].expense)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5">
                  {selectedDayTransactions.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                        <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                        <p className="text-xs text-muted-foreground">{t.category?.name || 'Sem categoria'}</p>
                      </div>
                      <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
