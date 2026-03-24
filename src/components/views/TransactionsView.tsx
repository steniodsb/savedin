import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { formatCurrency, Transaction, TransactionType } from '@/types/savedin';
import { Plus, Search, Trash2, Repeat, CreditCard, Receipt, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { FilterBar, FilterState, defaultFilters, applyFilters } from '@/components/finance/FilterBar';

type TransactionMode = 'all' | 'single' | 'recurring' | 'installment';

export function TransactionsView() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, payTransaction } = useTransactionsData();
  const { accounts } = useAccountsData();
  const { creditCards } = useCreditCardsData();
  const { categories, expenseCategories, incomeCategories } = useSavedinCategories();
  const { tags } = useTagsData();

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [modeFilter, setModeFilter] = useState<TransactionMode>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form state
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formMode, setFormMode] = useState<'single' | 'recurring' | 'installment'>('single');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCardId, setFormCardId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'paid'>('paid');
  const [formRecurrenceType, setFormRecurrenceType] = useState('monthly');
  const [formInstallmentTotal, setFormInstallmentTotal] = useState('');

  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener('savedin:add-transaction', handler);
    return () => window.removeEventListener('savedin:add-transaction', handler);
  }, []);

  const filteredTransactions = useMemo(() => {
    let result = applyFilters(transactions, filters);

    // Type filter
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);

    // Mode filter
    if (modeFilter === 'single') result = result.filter(t => !t.is_recurring && !t.installment_total);
    if (modeFilter === 'recurring') result = result.filter(t => t.is_recurring);
    if (modeFilter === 'installment') result = result.filter(t => !!t.installment_total);

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        (t.description || '').toLowerCase().includes(s) ||
        (t.category?.name || '').toLowerCase().includes(s)
      );
    }

    return result;
  }, [transactions, filters, typeFilter, modeFilter, search]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  // Totals
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormType('expense'); setFormMode('single'); setFormAmount(''); setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]); setFormCategoryId('');
    setFormAccountId(''); setFormCardId(''); setFormNotes(''); setFormStatus('paid');
    setFormRecurrenceType('monthly'); setFormInstallmentTotal('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormMode(t.is_recurring ? 'recurring' : t.installment_total ? 'installment' : 'single');
    setFormAmount(String(t.amount)); setFormDescription(t.description || '');
    setFormDate(t.date); setFormCategoryId(t.category_id || '');
    setFormAccountId(t.account_id || ''); setFormCardId(t.card_id || '');
    setFormNotes(t.notes || ''); setFormStatus(t.status || 'paid');
    setFormRecurrenceType(t.recurrence_type || 'monthly');
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
      account_id: (formAccountId && formAccountId !== 'none') ? formAccountId : null,
      card_id: (formCardId && formCardId !== 'none') ? formCardId : null,
      notes: formNotes || null,
      status: formStatus,
      is_recurring: formMode === 'recurring',
      recurrence_type: formMode === 'recurring' ? formRecurrenceType : null,
      installment_total: formMode === 'installment' && formInstallmentTotal ? Number(formInstallmentTotal) : null,
      installment_current: formMode === 'installment' && formInstallmentTotal ? 1 : null,
    };

    if (editingTransaction) {
      await updateTransaction({ id: editingTransaction.id, updates: data });
    } else {
      await addTransaction(data);
    }
    setIsModalOpen(false);
  };

  const availableCategories = formType === 'income' ? incomeCategories : expenseCategories;

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    if (status === 'overdue') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  };

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

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-500 font-medium">+{formatCurrency(totalIncome)}</span>
        <span className="text-destructive font-medium">-{formatCurrency(totalExpense)}</span>
        <span className={`font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-500' : 'text-destructive'}`}>
          = {formatCurrency(totalIncome - totalExpense)}
        </span>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        showStatus
        showCategory
        showAccount
        showCard
        showTag
      />

      {/* Type + Mode Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <Button key={f} variant={typeFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {([
            { value: 'all', label: 'Todos', icon: null },
            { value: 'single', label: 'Única', icon: Receipt },
            { value: 'recurring', label: 'Recorrente', icon: Repeat },
            { value: 'installment', label: 'Parcelada', icon: CreditCard },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setModeFilter(value as TransactionMode)}
              className={`text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-all ${
                modeFilter === value
                  ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* Transaction List */}
      {groupedTransactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhuma transação encontrada</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map(([date, txns]) => (
            <div key={date}>
              <p className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {txns.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => openEditModal(t)}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                        <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                          {t.is_recurring && <Repeat className="h-3 w-3 text-primary flex-shrink-0" />}
                          {t.installment_total && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{t.installment_current}/{t.installment_total}x</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(t.status || 'paid')}
                          <p className="text-xs text-muted-foreground">
                            {t.category?.name || 'Sem categoria'}
                            {t.account?.name && ` · ${t.account.name}`}
                            {t.credit_card?.name && ` · ${t.credit_card.name}`}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                      {t.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPayingId(t.id); setPayDate(new Date().toISOString().split('T')[0]); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 font-medium"
                        >
                          Pagar
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded">
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
            {/* Type */}
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <Button key={t} variant={formType === t ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setFormType(t); setFormCategoryId(''); }}>
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </Button>
              ))}
            </div>

            {/* Transaction Mode */}
            <div>
              <Label>Tipo de transação</Label>
              <div className="flex gap-2 mt-1">
                {([
                  { value: 'single', label: 'Única', icon: Receipt, desc: 'Pagamento único' },
                  { value: 'recurring', label: 'Recorrente', icon: Repeat, desc: 'Se repete automaticamente' },
                  { value: 'installment', label: 'Parcelada', icon: CreditCard, desc: 'Dividida em parcelas' },
                ] as const).map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setFormMode(value)}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      formMode === value ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${formMode === value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${formMode === value ? 'text-primary' : ''}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0,00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="text-xl font-bold" />
            </div>

            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Input placeholder="Ex: Supermercado, Salário..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>

            {/* Date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <DatePicker value={formDate} onChange={setFormDate} placeholder="Selecione" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label>Categoria</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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

            {/* Account / Card */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conta</Label>
                <Select value={formAccountId} onValueChange={(v) => { setFormAccountId(v); setFormCardId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Cartão" /></SelectTrigger>
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

            {/* Recurring options */}
            {formMode === 'recurring' && (
              <div>
                <Label>Frequência</Label>
                <Select value={formRecurrenceType} onValueChange={setFormRecurrenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Installment options */}
            {formMode === 'installment' && (
              <div>
                <Label>Número de parcelas</Label>
                <Input type="number" min="2" max="48" placeholder="Ex: 12" value={formInstallmentTotal} onChange={(e) => setFormInstallmentTotal(e.target.value)} />
                {formInstallmentTotal && Number(formAmount) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formInstallmentTotal}x de {formatCurrency(Number(formAmount) / Number(formInstallmentTotal))}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label>Notas</Label>
              <Textarea placeholder="Observações..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              {editingTransaction ? 'Salvar Alterações' : 'Adicionar Transação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Transaction Dialog */}
      <Dialog open={!!payingId} onOpenChange={() => setPayingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como Paga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data de pagamento</Label>
              <DatePicker value={payDate} onChange={setPayDate} placeholder="Data do pagamento" />
            </div>
            <Button
              onClick={async () => {
                if (payingId) {
                  await payTransaction({ id: payingId, paidAt: payDate + 'T00:00:00Z' });
                  setPayingId(null);
                }
              }}
              className="w-full"
            >
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
