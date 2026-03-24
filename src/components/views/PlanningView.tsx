import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { formatCurrency, Budget } from '@/types/savedin';
import { Plus, ChevronLeft, ChevronRight, Target, Pencil, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { FilterBar, FilterState, defaultFilters } from '@/components/finance/FilterBar';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function PlanningView() {
  const { budgets, addBudget, updateBudget, deleteBudget, getBudgetsForMonth } = useBudgetsData();
  const { expenseCategories } = useSavedinCategories();
  const { transactions } = useTransactionsData();

  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formLimit, setFormLimit] = useState('');

  const monthBudgets = useMemo(() => {
    const list = getBudgetsForMonth(selectedMonth, selectedYear);
    return list.map(budget => {
      const spent = transactions
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && t.category_id === budget.category_id &&
            d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions, selectedMonth, selectedYear]);

  const totalBudget = monthBudgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const totalSpent = monthBudgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = monthBudgets.filter(b => b.spent > Number(b.monthly_limit)).length;
  const onTrackCount = monthBudgets.filter(b => b.spent <= Number(b.monthly_limit)).length;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const openAddModal = () => {
    setEditingBudget(null); setFormCategoryId(''); setFormLimit(''); setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormCategoryId(budget.category_id || '');
    setFormLimit(String(budget.monthly_limit));
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formLimit || Number(formLimit) <= 0) return;
    const data = {
      category_id: formCategoryId || null,
      monthly_limit: Number(formLimit),
      month: selectedMonth,
      year: selectedYear,
      is_active: true,
    };
    if (editingBudget) {
      await updateBudget({ id: editingBudget.id, updates: data });
    } else {
      await addBudget(data);
    }
    setIsModalOpen(false);
  };

  // Categories not yet budgeted
  const budgetedCategoryIds = monthBudgets.map(b => b.category_id);
  const availableCategories = expenseCategories.filter(c => !budgetedCategoryIds.includes(c.id));

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Planejamento</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Orçamento</span>
        </Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="text-lg font-semibold min-w-[180px] text-center">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} showCategory showDate={false} showAccount={false} showCard={false} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Orçamento Total" value={totalBudget} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="h-4 w-4 text-primary" /></div>}
        />
        <StatCard title="Gasto até Agora" value={totalSpent} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>}
        />
        <StatCard title="No Limite" value={`${onTrackCount} categorias`} isCurrency={false} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-500" /></div>}
        />
        <StatCard title="Acima do Limite" value={`${overBudgetCount} categorias`} isCurrency={false} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>}
        />
      </div>

      {/* Overall Progress */}
      {totalBudget > 0 && (
        <Card className="relative overflow-hidden">
          <TechGridPattern position="top-right" size={100} opacity={0.06} />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm font-bold">
                {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
              </span>
            </div>
            <Progress
              value={Math.min((totalSpent / totalBudget) * 100, 100)}
              className={`h-3 ${totalSpent > totalBudget ? '[&>div]:bg-destructive' : ''}`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {totalBudget > totalSpent
                ? `${formatCurrency(totalBudget - totalSpent)} disponível`
                : `${formatCurrency(totalSpent - totalBudget)} acima do orçamento`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Budget List */}
      {monthBudgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum orçamento definido para este mês</p>
            <Button onClick={openAddModal} variant="outline" className="mt-4">Criar primeiro orçamento</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {monthBudgets.map((budget) => {
            const percentage = Number(budget.monthly_limit) > 0
              ? (budget.spent / Number(budget.monthly_limit)) * 100 : 0;
            const isOver = percentage > 100;
            const remaining = Number(budget.monthly_limit) - budget.spent;

            return (
              <Card key={budget.id} className={isOver ? 'border-destructive/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: budget.category?.bg || '#F5F5F5' }}
                    >
                      <LucideIcon name={budget.category?.icon || 'MoreHorizontal'} className="h-5 w-5" style={{ color: budget.category?.color || '#9E9E9E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{budget.category?.name || 'Geral'}</p>
                      <p className="text-xs text-muted-foreground">
                        {isOver ? (
                          <span className="text-destructive font-medium">Acima em {formatCurrency(Math.abs(remaining))}</span>
                        ) : (
                          <span>{formatCurrency(remaining)} disponível</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                        {percentage.toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(budget)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBudget(budget.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{formatCurrency(budget.spent)}</span>
                    <span>{formatCurrency(Number(budget.monthly_limit))}</span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={`h-2 ${isOver ? '[&>div]:bg-destructive' : percentage > 80 ? '[&>div]:bg-amber-500' : ''}`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {(editingBudget ? expenseCategories : availableCategories).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <LucideIcon name={c.icon} className="h-4 w-4" style={{ color: c.color }} />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Limite Mensal (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="1000.00" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Orçamento para {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
            <Button onClick={handleSubmit} className="w-full">
              {editingBudget ? 'Salvar' : 'Criar Orçamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
