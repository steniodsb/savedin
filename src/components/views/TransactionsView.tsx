import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { formatCurrency, Transaction, TransactionType } from '@/types/savedin';
import { Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { LucideIcon } from '@/components/ui/LucideIcon';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function TransactionsView() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactionsData();
  const { accounts } = useAccountsData();
  const { creditCards } = useCreditCardsData();
  const { categories, expenseCategories, incomeCategories } = useSavedinCategories();
  const { tags } = useTagsData();

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form state
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCardId, setFormCardId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurrenceType, setFormRecurrenceType] = useState('');
  const [formInstallmentTotal, setFormInstallmentTotal] = useState('');

  // Listen for add-transaction event from bottom nav
  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener('savedin:add-transaction', handler);
    return () => window.removeEventListener('savedin:add-transaction', handler);
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      })
      .filter(t => filter === 'all' || t.type === filter)
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (t.description || '').toLowerCase().includes(s) ||
          (t.category?.name || '').toLowerCase().includes(s);
      });
  }, [transactions, selectedMonth, selectedYear, filter, search]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormType('expense');
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategoryId('');
    setFormAccountId('');
    setFormCardId('');
    setFormNotes('');
    setFormIsRecurring(false);
    setFormRecurrenceType('');
    setFormInstallmentTotal('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormAmount(String(t.amount));
    setFormDescription(t.description || '');
    setFormDate(t.date);
    setFormCategoryId(t.category_id || '');
    setFormAccountId(t.account_id || '');
    setFormCardId(t.card_id || '');
    setFormNotes(t.notes || '');
    setFormIsRecurring(t.is_recurring);
    setFormRecurrenceType(t.recurrence_type || '');
    setFormInstallmentTotal(t.installment_total ? String(t.installment_total) : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;

    const data: any = {
      type: formType,
      amount: Number(formAmount),
      description: formDescription || null,
      date: formDate,
      category_id: formCategoryId || null,
      account_id: formAccountId || null,
      card_id: formCardId || null,
      notes: formNotes || null,
      is_recurring: formIsRecurring,
      recurrence_type: formIsRecurring ? formRecurrenceType || null : null,
      installment_total: formInstallmentTotal ? Number(formInstallmentTotal) : null,
      installment_current: formInstallmentTotal ? 1 : null,
    };

    if (editingTransaction) {
      await updateTransaction({ id: editingTransaction.id, updates: data });
    } else {
      await addTransaction(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const availableCategories = formType === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Transações</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Transação</span>
        </Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold min-w-[180px] text-center">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
            </Button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Transaction List */}
      {groupedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map(([date, txns]) => (
            <div key={date}>
              <p className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {txns.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => openEditModal(t)}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}
                      >
                        <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.category?.name || 'Sem categoria'}
                          {t.account?.name && ` · ${t.account.name}`}
                          {t.credit_card?.name && ` · ${t.credit_card.name}`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selector */}
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <Button
                  key={t}
                  variant={formType === t ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => { setFormType(t); setFormCategoryId(''); }}
                >
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </Button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="text-xl font-bold"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Supermercado, Salário..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Date */}
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <Label>Categoria</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
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

            {/* Account or Card */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conta</Label>
                <Select value={formAccountId} onValueChange={(v) => { setFormAccountId(v); setFormCardId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.filter(a => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formType === 'expense' && (
                <div>
                  <Label>Cartão</Label>
                  <Select value={formCardId} onValueChange={(v) => { setFormCardId(v); setFormAccountId(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {creditCards.filter(c => c.is_active).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Installments (only for card expenses) */}
            {formCardId && formCardId !== 'none' && formType === 'expense' && (
              <div>
                <Label>Parcelas (deixe vazio se à vista)</Label>
                <Input
                  type="number"
                  min="2"
                  max="48"
                  placeholder="Número de parcelas"
                  value={formInstallmentTotal}
                  onChange={(e) => setFormInstallmentTotal(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Observações..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Recurrence */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="recurring" className="cursor-pointer">Transação recorrente</Label>
            </div>

            {formIsRecurring && (
              <Select value={formRecurrenceType} onValueChange={setFormRecurrenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button onClick={handleSubmit} className="w-full">
              {editingTransaction ? 'Salvar Alterações' : 'Adicionar Transação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
