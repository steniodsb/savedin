import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { formatCurrency, Transaction, TransactionType } from '@/types/savedin';
import { Plus, Search, Trash2, Repeat, CreditCard, Receipt, Clock, CheckCircle2, AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { LucideIcon, IconPicker } from '@/components/ui/LucideIcon';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrencyInput, handleCurrencyChange, valueToCents } from '@/utils/currencyInput';
import { EnvironmentBadge } from '@/components/shared/EnvironmentBadge';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import { getInvoiceMonthYear } from '@/utils/invoiceUtils';
import { useUIStore } from '@/store/useUIStore';

type TransactionMode = 'all' | 'single' | 'recurring' | 'installment';

export function TransactionsView() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, payTransaction } = useTransactionsData();
  const { accounts, addAccount } = useAccountsData();
  const { creditCards, invoices, addCreditCard } = useCreditCardsData();
  const { categories, expenseCategories, incomeCategories, subcategories, getSubcategories, addCategory } = useSavedinCategories();
  const { tags, addTag } = useTagsData();
  const { environments } = useEnvironmentsData();
  const { viewMode } = useUIStore();

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [modeFilter, setModeFilter] = useState<TransactionMode>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
  const [formInstallmentCurrent, setFormInstallmentCurrent] = useState('1');
  const [formSelectedTags, setFormSelectedTags] = useState<string[]>([]);

  // New category inline modal state
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatIcon, setNewCatIcon] = useState('MoreHorizontal');
  const [newCatColor, setNewCatColor] = useState('#9E9E9E');
  const [newCatParentId, setNewCatParentId] = useState<string>('');

  // New tag inline modal state
  const [isNewTagModalOpen, setIsNewTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  // New account inline modal state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIcon, setNewAccountIcon] = useState('Landmark');
  const [newAccountColor, setNewAccountColor] = useState('#6366f1');
  const [newAccountLogoPreview, setNewAccountLogoPreview] = useState<string | null>(null);

  // New card inline modal state
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardBrand, setNewCardBrand] = useState('CreditCard');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardLogoPreview, setNewCardLogoPreview] = useState<string | null>(null);
  const [newCardClosingDay, setNewCardClosingDay] = useState('1');
  const [newCardDueDay, setNewCardDueDay] = useState('10');

  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener('savedin:add-transaction', handler);
    return () => window.removeEventListener('savedin:add-transaction', handler);
  }, []);

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

  // Helper: get effective month for a transaction based on view mode
  const getEffectiveMonth = (t: { date: string; card_id?: string | null; credit_card?: { closing_day: number } | null }) => {
    if (viewMode === 'caixa' && t.card_id && t.credit_card?.closing_day) {
      return getInvoiceMonthYear(t.date, t.credit_card.closing_day);
    }
    const d = new Date(t.date);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  };

  // Invoice payments are transfers, not real expenses
  const isInvoicePayment = (t: { card_id?: string | null; account_id?: string | null }) =>
    !!t.card_id && !!t.account_id;

  const filteredTransactions = useMemo(() => {
    // Filter by selected month (using effective month based on view mode)
    let result = transactions.filter(t => {
      if (isInvoicePayment(t)) return false;
      const eff = getEffectiveMonth(t);
      return eff.month === viewMonth && eff.year === viewYear;
    });

    // Type filter
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);

    // Mode filter
    if (modeFilter === 'single') result = result.filter(t => !t.is_recurring && !t.installment_total);
    if (modeFilter === 'recurring') result = result.filter(t => t.is_recurring);
    if (modeFilter === 'installment') result = result.filter(t => !!t.installment_total);

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => getEffectiveStatus(t) === statusFilter);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        (t.description || '').toLowerCase().includes(s) ||
        (t.category?.name || '').toLowerCase().includes(s)
      );
    }

    return result;
  }, [transactions, viewMonth, viewYear, typeFilter, modeFilter, statusFilter, search, viewMode]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  // Effective status for a transaction (card txns derive status from invoice)
  const getEffectiveStatus = (t: Transaction): string => {
    if (t.card_id && !t.account_id) {
      const card = creditCards.find(c => c.id === t.card_id);
      if (card) {
        const inv = getInvoiceMonthYear(t.date, card.closing_day);
        const invoiceRecord = invoices.find(i => i.card_id === card.id && i.month === inv.month && i.year === inv.year);
        return invoiceRecord?.status === 'paid' ? 'paid' : 'pending';
      }
    }
    return t.status || 'paid';
  };

  // Totals
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const paidExpenses = filteredTransactions.filter(t => t.type === 'expense' && getEffectiveStatus(t) === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const pendingExpenses = filteredTransactions.filter(t => t.type === 'expense' && getEffectiveStatus(t) === 'pending').reduce((s, t) => s + Number(t.amount), 0);

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormType('expense'); setFormMode('single'); setFormAmount(''); setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]); setFormCategoryId('');
    setFormAccountId(''); setFormCardId(''); setFormNotes(''); setFormStatus('paid');
    setFormRecurrenceType('monthly'); setFormInstallmentTotal(''); setFormInstallmentCurrent('1');
    setFormSelectedTags([]);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormMode(t.is_recurring ? 'recurring' : t.installment_total ? 'installment' : 'single');
    setFormAmount(valueToCents(Number(t.amount))); setFormDescription(t.description || '');
    setFormDate(t.date); setFormCategoryId(t.category_id || '');
    setFormAccountId(t.account_id || ''); setFormCardId(t.card_id || '');
    setFormNotes(t.notes || ''); setFormStatus(t.status || 'paid');
    setFormRecurrenceType(t.recurrence_type || 'monthly');
    setFormInstallmentTotal(t.installment_total ? String(t.installment_total) : '');
    setFormInstallmentCurrent(t.installment_current ? String(t.installment_current) : '1');
    setFormSelectedTags(t.tags || []);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formAmount || parseInt(formAmount, 10) <= 0) {
      toast({ title: 'Preencha o valor da transação', variant: 'destructive' });
      return;
    }

    const data: any = {
      type: formType,
      amount: parseInt(formAmount, 10) / 100,
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
      installment_current: formMode === 'installment' && formInstallmentTotal ? Number(formInstallmentCurrent) || 1 : null,
      tags: formSelectedTags.length > 0 ? formSelectedTags : null,
    };

    if (editingTransaction) {
      await updateTransaction({ id: editingTransaction.id, updates: data });
    } else {
      await addTransaction(data);
    }
    setIsModalOpen(false);
  };

  const availableCategories = formType === 'income' ? incomeCategories : expenseCategories;

  const handleCreateCategory = async () => {
    if (!newCatName) {
      toast({ title: 'Preencha o nome da categoria', variant: 'destructive' });
      return;
    }
    const slug = newCatName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
    const result = await addCategory({
      name: newCatName,
      slug,
      type: newCatType,
      icon: newCatIcon,
      color: newCatColor,
      bg: newCatColor + '1A',
      is_active: true,
      environment_id: null,
      parent_id: newCatParentId || null,
    });
    if (result?.id) {
      setFormCategoryId(result.id);
    }
    setIsNewCategoryModalOpen(false);
    setNewCatName('');
    setNewCatType(formType);
    setNewCatIcon('MoreHorizontal');
    setNewCatColor('#9E9E9E');
    setNewCatParentId('');
  };

  const handleCreateTag = async () => {
    if (!newTagName) {
      toast({ title: 'Preencha o nome da tag', variant: 'destructive' });
      return;
    }
    const result = await addTag({
      name: newTagName,
      color: newTagColor,
      environment_id: '',
    });
    if (result?.id) {
      setFormSelectedTags(prev => [...prev, result.id]);
    }
    setIsNewTagModalOpen(false);
    setNewTagName('');
    setNewTagColor('#6366f1');
  };

  const handleAccountLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewAccountLogoPreview(base64);
      setNewAccountIcon(`url:${base64}`);
    };
    reader.readAsDataURL(file);
  };

  const handleCardLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewCardLogoPreview(base64);
      setNewCardBrand(`url:${base64}`);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName) {
      toast({ title: 'Preencha o nome da conta', variant: 'destructive' });
      return;
    }
    const result = await addAccount({
      name: newAccountName,
      type: 'checking',
      balance: 0,
      color: newAccountColor,
      icon: newAccountIcon,
      is_active: true,
      environment_id: '',
    });
    if (result?.id) {
      setFormAccountId(result.id);
      setFormCardId('');
    }
    setIsNewAccountModalOpen(false);
    setNewAccountName('');
    setNewAccountIcon('Landmark');
    setNewAccountColor('#6366f1');
    setNewAccountLogoPreview(null);
  };

  const handleCreateCard = async () => {
    if (!newCardName) {
      toast({ title: 'Preencha o nome do cartão', variant: 'destructive' });
      return;
    }
    const result = await addCreditCard({
      name: newCardName,
      credit_limit: newCardLimit ? parseInt(newCardLimit, 10) / 100 : 0,
      closing_day: Number(newCardClosingDay) || 1,
      due_day: Number(newCardDueDay) || 10,
      color: '#6366f1',
      icon: newCardBrand,
      is_active: true,
      environment_id: '',
    });
    if (result?.id) {
      setFormCardId(result.id);
      setFormAccountId('');
    }
    setIsNewCardModalOpen(false);
    setNewCardName('');
    setNewCardBrand('CreditCard');
    setNewCardLimit('');
    setNewCardClosingDay('1');
    setNewCardDueDay('10');
    setNewCardLogoPreview(null);
  };

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    if (status === 'overdue') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Transações</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Transação</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-3 sm:p-5 text-center">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Receitas</p>
          <p className="text-base sm:text-2xl font-extrabold text-green-500">+{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3 sm:p-5 text-center">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Despesas</p>
          <p className="text-base sm:text-2xl font-extrabold text-destructive">-{formatCurrency(totalExpense)}</p>
        </div>
        <div className={`rounded-2xl p-3 sm:p-5 text-center ${totalIncome - totalExpense >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Saldo</p>
          <p className={`text-base sm:text-2xl font-extrabold ${totalIncome - totalExpense >= 0 ? 'text-green-500' : 'text-destructive'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Paid / Pending cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-3 sm:p-5 text-center">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Pagas</p>
          <p className="text-base sm:text-2xl font-extrabold text-green-500">{formatCurrency(paidExpenses)}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 sm:p-5 text-center">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 sm:mb-2 uppercase tracking-wide">Pendentes</p>
          <p className="text-base sm:text-2xl font-extrabold text-amber-500">{formatCurrency(pendingExpenses)}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <ViewModeToggle />
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
                  onClick={() => { setViewMonth(i + 1); setViewYear(viewYear); setMonthPickerOpen(false); }}
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
        <div className="flex gap-1.5">
          {([
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'paid', label: 'Pagas' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`text-xs px-2.5 py-1.5 rounded-full transition-all ${
                statusFilter === value
                  ? value === 'pending' ? 'bg-amber-500/10 text-amber-500 font-medium border border-amber-500/30'
                  : value === 'paid' ? 'bg-green-500/10 text-green-500 font-medium border border-green-500/30'
                  : 'bg-primary/10 text-primary font-medium border border-primary/30'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
              }`}
            >
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
                    <div key={t.id} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => openEditModal(t)}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                        <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                          {t.is_recurring && <Repeat className="h-3 w-3 text-primary flex-shrink-0" />}
                          {t.installment_total && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold flex-shrink-0">
                              {t.installment_current}/{t.installment_total}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {statusIcon(getEffectiveStatus(t))}
                          <p className="text-xs text-muted-foreground">
                            {t.category?.parent_id
                              ? `${categories.find(c => c.id === t.category?.parent_id)?.name || ''} › ${t.category?.name}`
                              : (t.category?.name || 'Sem categoria')}
                            {t.account?.name && ` · ${t.account.name}`}
                            {t.credit_card?.name && ` · 💳 ${t.credit_card.name}`}
                          </p>
                          <EnvironmentBadge environmentId={t.environment_id} environments={environments} />
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                      {(getEffectiveStatus(t) === 'pending') && !t.card_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPayingId(t.id); setPayDate(new Date().toISOString().split('T')[0]); }}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 font-medium flex-shrink-0"
                        >
                          Pagar
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4 text-destructive/60 hover:text-destructive" />
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
              <Label>{formMode === 'installment' ? 'Valor da parcela (R$)' : 'Valor (R$)'}</Label>
              <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(formAmount)} onChange={(e) => handleCurrencyChange(e, setFormAmount)} className="text-xl font-bold" />
            </div>

            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Input placeholder="Ex: Supermercado, Salário..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>

            {/* Date + Status */}
            <div className={`grid gap-3 ${formCardId ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div>
                <Label>Data</Label>
                <DatePicker value={formDate} onChange={setFormDate} placeholder="Selecione" />
              </div>
              {!formCardId && (
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
              )}
            </div>

            {/* Category */}
            <div>
              <Label>Categoria</Label>
              <Select
                value={formCategoryId}
                onValueChange={(v) => {
                  if (v === '__new__') {
                    setNewCatType(formType);
                    setIsNewCategoryModalOpen(true);
                  } else {
                    setFormCategoryId(v);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => {
                    const subs = getSubcategories(c.id);
                    return (
                      <div key={c.id}>
                        <SelectItem value={c.id}>
                          <div className="flex items-center gap-2">
                            <LucideIcon name={c.icon} className="h-4 w-4" style={{ color: c.color }} />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                        {subs.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            <div className="flex items-center gap-2 pl-4">
                              <LucideIcon name={sub.icon} className="h-3.5 w-3.5" style={{ color: sub.color }} />
                              <span className="text-muted-foreground">{sub.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                  <SelectItem value="__new__" className="text-primary">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Criar nova categoria</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account / Card */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conta</Label>
                <Select
                  value={formAccountId}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setIsNewAccountModalOpen(true);
                    } else {
                      setFormAccountId(v);
                      setFormCardId('');
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts.filter(a => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          {a.icon?.startsWith('url:') ? (
                            <img src={a.icon.slice(4)} alt="" className="h-4 w-4 rounded object-cover" />
                          ) : (
                            <LucideIcon name={a.icon || 'Landmark'} className="h-4 w-4" style={{ color: a.color }} />
                          )}
                          <span>{a.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Criar nova conta</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formType === 'expense' && (
                <div>
                  <Label>Cartão</Label>
                  <Select
                    value={formCardId}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setIsNewCardModalOpen(true);
                      } else {
                        setFormCardId(v);
                        setFormAccountId('');
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Cartão" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {creditCards.filter(c => c.is_active).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            {c.icon?.startsWith('url:') ? (
                              <img src={c.icon.slice(4)} alt="" className="h-4 w-4 rounded object-cover" />
                            ) : (
                              <LucideIcon name={c.icon || 'CreditCard'} className="h-4 w-4" style={{ color: c.color }} />
                            )}
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Criar novo cartão</span>
                        </div>
                      </SelectItem>
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
              <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                <div className={editingTransaction ? 'grid grid-cols-2 gap-3' : ''}>
                  <div>
                    <Label>Nº de parcelas</Label>
                    <Select value={formInstallmentTotal || ''} onValueChange={setFormInstallmentTotal}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24, 36, 48].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingTransaction && (
                    <div>
                      <Label>Parcela atual</Label>
                      <Input type="number" min="1" max={formInstallmentTotal || '48'} placeholder="1" value={formInstallmentCurrent} onChange={(e) => setFormInstallmentCurrent(e.target.value)} />
                    </div>
                  )}
                </div>
                {formInstallmentTotal && parseInt(formAmount, 10) > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-muted-foreground">Total da compra:</span>
                    <span className="font-bold text-primary">{formInstallmentTotal}x {formatCurrency(parseInt(formAmount, 10) / 100)} = {formatCurrency((parseInt(formAmount, 10) / 100) * Number(formInstallmentTotal))}</span>
                  </div>
                )}
                {editingTransaction && formInstallmentCurrent && formInstallmentTotal && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso:</span>
                    <span className="font-medium">{formInstallmentCurrent} de {formInstallmentTotal} parcelas</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {formSelectedTags.length > 0 ? (
                      <span className="flex items-center gap-1.5 truncate">
                        {formSelectedTags.map(id => {
                          const tag = tags.find(t => t.id === id);
                          return tag ? (
                            <span key={id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                              #{tag.name}
                            </span>
                          ) : null;
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Selecione</span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                  {tags.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      {tags.map((tag) => {
                        const isSelected = formSelectedTags.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              setFormSelectedTags(prev =>
                                isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                              );
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className={tags.length > 0 ? 'border-t border-border/50 mt-1 pt-1' : ''}>
                    <button
                      type="button"
                      onClick={() => setIsNewTagModalOpen(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Criar nova tag</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
        title="Deletar transação?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Deletar"
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deleteTransaction(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />

      {/* New Category Inline Modal */}
      <Dialog open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type */}
            <div>
              <Label>Tipo</Label>
              <Select value={newCatType} onValueChange={(v) => setNewCatType(v as TransactionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Parent category (subcategoria) */}
            <div>
              <Label>Categoria pai (opcional)</Label>
              <Select value={newCatParentId || 'none'} onValueChange={(v) => setNewCatParentId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (categoria principal)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                  {(newCatType === 'expense' ? expenseCategories : incomeCategories).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <LucideIcon name={c.icon} className="h-4 w-4" style={{ color: c.color }} />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newCatParentId && <p className="text-[10px] text-muted-foreground mt-1">Será criada como subcategoria</p>}
            </div>
            <div>
              <Label>Nome</Label>
              <Input placeholder={newCatParentId ? 'Ex: Supermercado, Restaurante...' : 'Nome da categoria'} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            </div>
            <div>
              <Label>Ícone</Label>
              <IconPicker value={newCatIcon} onChange={setNewCatIcon} />
            </div>
            <ColorPicker value={newCatColor} onChange={setNewCatColor} label="Cor" />
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: newCatColor + '1A' }}>
                <LucideIcon name={newCatIcon} className="h-5 w-5" style={{ color: newCatColor }} />
              </div>
              <div>
                <span className="text-sm font-medium">{newCatName || 'Nome da categoria'}</span>
                {newCatParentId && (
                  <p className="text-[10px] text-muted-foreground">
                    Sub de {(newCatType === 'expense' ? expenseCategories : incomeCategories).find(c => c.id === newCatParentId)?.name}
                  </p>
                )}
                {!newCatParentId && <p className="text-[10px] text-muted-foreground">{newCatType === 'expense' ? 'Despesa' : 'Receita'}</p>}
              </div>
            </div>
            <Button onClick={handleCreateCategory} className="w-full" disabled={!newCatName}>
              Criar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Tag Inline Modal */}
      <Dialog open={isNewTagModalOpen} onOpenChange={setIsNewTagModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome da tag" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
            </div>
            <ColorPicker value={newTagColor} onChange={setNewTagColor} label="Cor" />
            {/* Preview */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
              <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: newTagColor + '20', color: newTagColor }}>
                #{newTagName || 'tag'}
              </span>
            </div>
            <Button onClick={handleCreateTag} className="w-full" disabled={!newTagName}>
              Criar Tag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Account Inline Modal */}
      <Dialog open={isNewAccountModalOpen} onOpenChange={setIsNewAccountModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar/Logo no topo */}
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group relative">
                {newAccountLogoPreview ? (
                  <img src={newAccountLogoPreview} alt="Logo" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border/30 group-hover:ring-primary/50 transition-all" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center ring-2 ring-border/30 group-hover:ring-primary/50 transition-all" style={{ backgroundColor: newAccountColor + '1A' }}>
                    <LucideIcon name={newAccountIcon} className="h-7 w-7" style={{ color: newAccountColor }} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
                  <Plus className="h-3 w-3" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAccountLogoSelect} />
              </label>
              {newAccountLogoPreview && (
                <button
                  type="button"
                  onClick={() => { setNewAccountLogoPreview(null); setNewAccountIcon('Landmark'); }}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Remover logo
                </button>
              )}
              {!newAccountLogoPreview && (
                <p className="text-[11px] text-muted-foreground">Toque para enviar logo</p>
              )}
            </div>

            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank, Itaú..." value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
            </div>

            {!newAccountLogoPreview && (
              <div>
                <Label>Ícone</Label>
                <IconPicker value={newAccountIcon} onChange={setNewAccountIcon} />
              </div>
            )}

            <ColorPicker value={newAccountColor} onChange={setNewAccountColor} label="Cor" />

            <Button onClick={handleCreateAccount} className="w-full" disabled={!newAccountName}>
              Criar Conta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Card Inline Modal */}
      <Dialog open={isNewCardModalOpen} onOpenChange={setIsNewCardModalOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cartão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank, Inter Gold..." value={newCardName} onChange={(e) => setNewCardName(e.target.value)} />
            </div>

            {/* Icon or Logo */}
            <div>
              <Label>Ícone ou Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {newCardLogoPreview ? (
                  <div className="relative">
                    <img src={newCardLogoPreview} alt="Logo" className="h-10 w-10 rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => { setNewCardLogoPreview(null); setNewCardBrand('CreditCard'); }}
                      className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted/30">
                    <LucideIcon name={newCardBrand} className="h-5 w-5" />
                  </div>
                )}
                <label className="cursor-pointer text-xs px-3 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  <Plus className="h-3 w-3" />
                  Upload logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleCardLogoSelect} />
                </label>
              </div>
            </div>

            {/* Brand selector (only when no logo) */}
            {!newCardLogoPreview && (
              <div>
                <Label>Bandeira</Label>
                <Select value={newCardBrand} onValueChange={setNewCardBrand}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 'CreditCard', label: 'Visa' },
                      { value: 'CircleDot', label: 'MasterCard' },
                      { value: 'Layers', label: 'HiperCard' },
                      { value: 'SquareStack', label: 'American Express' },
                      { value: 'Landmark', label: 'Elo' },
                      { value: 'Wallet', label: 'Outra' },
                    ].map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        <div className="flex items-center gap-2">
                          <LucideIcon name={b.value} className="h-4 w-4" />
                          <span>{b.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Limite (R$)</Label>
              <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(newCardLimit)} onChange={(e) => handleCurrencyChange(e, setNewCardLimit)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia de fechamento</Label>
                <Input type="number" min="1" max="31" value={newCardClosingDay} onChange={(e) => setNewCardClosingDay(e.target.value)} />
              </div>
              <div>
                <Label>Dia de vencimento</Label>
                <Input type="number" min="1" max="31" value={newCardDueDay} onChange={(e) => setNewCardDueDay(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreateCard} className="w-full" disabled={!newCardName}>
              Criar Cartão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
