import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { useAccountsData } from '@/hooks/useAccountsData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatCurrency, CreditCard as CreditCardType } from '@/types/savedin';
import { toast } from '@/hooks/use-toast';
import { Plus, CreditCard, Pencil, Trash2, ChevronLeft, ChevronRight, Snowflake, FileText, Banknote } from 'lucide-react';
import { IconPicker } from '@/components/ui/LucideIcon';
import { Progress } from '@/components/ui/progress';
import { CreditCardDisplay } from '@/components/finance/CreditCardDisplay';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { StatCard } from '@/components/finance/StatCard';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { formatCurrencyInput, handleCurrencyChange, valueToCents } from '@/utils/currencyInput';
import { EnvironmentBadge } from '@/components/shared/EnvironmentBadge';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { useUIStore } from '@/store/useUIStore';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { FilterBar, FilterState, defaultFilters, applyFilters } from '@/components/finance/FilterBar';

export function CardsView() {
  const { creditCards, invoices, totalLimit, addCreditCard, updateCreditCard, deleteCreditCard } = useCreditCardsData();
  const { transactions, addTransaction } = useTransactionsData();
  const { accounts } = useAccountsData();
  const { environments, defaultEnvironment } = useEnvironmentsData();
  const { selectedEnvironmentId } = useUIStore();
  const { categories } = useSavedinCategories();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formClosingDay, setFormClosingDay] = useState('');
  const [formDueDay, setFormDueDay] = useState('');
  const [formColor, setFormColor] = useState('#3F51B5');
  const [formIcon, setFormIcon] = useState('CreditCard');
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);
  const [formEnvironmentId, setFormEnvironmentId] = useState('');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Filter transactions
  const filteredTransactions = useMemo(() => applyFilters(transactions, filters, categories), [transactions, filters, categories]);

  // Exclude invoice payments (transactions with both card_id and account_id are payments, not purchases)
  const isCardPurchase = (t: { card_id?: string | null; account_id?: string | null; type: string }) =>
    t.card_id && t.type === 'expense' && !t.account_id;

  // Current month usage (FIXED - ignores filters, always current month for invoice)
  const currentMonthUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    creditCards.forEach(card => {
      usage[card.id] = transactions
        .filter(t => t.card_id === card.id && isCardPurchase(t))
        .filter(t => { const d = new Date(t.date); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear; })
        .reduce((sum, t) => sum + Number(t.amount), 0);
    });
    return usage;
  }, [creditCards, transactions, currentMonth, currentYear]);

  // Filtered usage (changes with filters - for "Gastos no Período")
  const filteredUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    creditCards.forEach(card => {
      usage[card.id] = filteredTransactions
        .filter(t => t.card_id === card.id && isCardPurchase(t))
        .reduce((sum, t) => sum + Number(t.amount), 0);
    });
    return usage;
  }, [creditCards, filteredTransactions]);

  // Dynamic spending chart based on filter preset
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodChartTitle = filters.datePreset === 'today' ? 'Gastos de Hoje'
    : filters.datePreset === 'week' ? 'Gastos da Semana'
    : filters.datePreset === 'month' ? 'Gastos do Mês'
    : filters.datePreset === 'year' ? 'Gastos do Ano'
    : 'Gastos do Período';

  const periodSpending = useMemo(() => {
    const ac = creditCards[activeCardIndex];
    if (!ac) return { labels: [] as string[], data: [] as number[] };

    const cardTxns = filteredTransactions.filter(t => t.card_id === ac.id && isCardPurchase(t));

    if (filters.datePreset === 'today') {
      // Group by hour (simplified: morning/afternoon/evening)
      const periods = ['Manhã', 'Tarde', 'Noite'];
      const data = [0, 0, 0];
      cardTxns.forEach(t => {
        const h = new Date(t.created_at).getHours();
        if (h < 12) data[0] += Number(t.amount);
        else if (h < 18) data[1] += Number(t.amount);
        else data[2] += Number(t.amount);
      });
      return { labels: periods, data };
    }

    if (filters.datePreset === 'week') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const today = new Date();
      const data = days.map((_, dayIndex) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (today.getDay() - dayIndex));
        const dateStr = d.toISOString().split('T')[0];
        return cardTxns.filter(t => t.date === dateStr).reduce((sum, t) => sum + Number(t.amount), 0);
      });
      return { labels: days, data };
    }

    if (filters.datePreset === 'month') {
      // Group by week of month
      const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
      const data = [0, 0, 0, 0, 0];
      cardTxns.forEach(t => {
        const day = new Date(t.date).getDate();
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
        data[weekIdx] += Number(t.amount);
      });
      const activeWeeks = data.reduce((c, v, i) => v > 0 || i < 4 ? c + 1 : c, 0);
      return { labels: weeks.slice(0, Math.max(activeWeeks, 4)), data: data.slice(0, Math.max(activeWeeks, 4)) };
    }

    if (filters.datePreset === 'year') {
      const data = Array(12).fill(0);
      cardTxns.forEach(t => {
        const m = new Date(t.date).getMonth();
        data[m] += Number(t.amount);
      });
      return { labels: MONTHS_SHORT, data };
    }

    // Custom or 'all': group by month
    const byMonth: Record<string, number> = {};
    cardTxns.forEach(t => {
      const d = new Date(t.date);
      const key = `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      byMonth[key] = (byMonth[key] || 0) + Number(t.amount);
    });
    const entries = Object.entries(byMonth).slice(-12);
    return { labels: entries.map(e => e[0]), data: entries.map(e => e[1]) };
  }, [creditCards, activeCardIndex, filteredTransactions, filters.datePreset]);

  const maxPeriod = Math.max(...(periodSpending.data.length > 0 ? periodSpending.data : [1]), 1);
  const activeCard = creditCards[activeCardIndex];
  // Invoice = always current month (fixed)
  const activeInvoice = activeCard ? currentMonthUsage[activeCard.id] || 0 : 0;
  const activeAvailable = activeCard ? Number(activeCard.credit_limit) - activeInvoice : 0;
  // Period usage = changes with filters
  const activePeriodUsage = activeCard ? filteredUsage[activeCard.id] || 0 : 0;

  // Days until due
  const daysUntilDue = activeCard ? (() => {
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), activeCard.due_day);
    if (due < today) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  })() : undefined;

  // Card transactions based on filters (excludes invoice payments)
  const cardTransactions = activeCard
    ? filteredTransactions.filter(t => t.card_id === activeCard.id && isCardPurchase(t))
    : [];

  const openAddModal = () => {
    setEditingCard(null); setFormName(''); setFormLimit(''); setFormClosingDay(''); setFormDueDay(''); setFormColor('#3F51B5'); setFormIcon('CreditCard'); setFormLogoPreview(null); setFormEnvironmentId(defaultEnvironment?.id || ''); setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCardType) => {
    setEditingCard(card); setFormName(card.name); setFormLimit(valueToCents(Number(card.credit_limit))); setFormClosingDay(String(card.closing_day)); setFormDueDay(String(card.due_day)); setFormColor(card.color); setFormIcon(card.icon?.startsWith('url:') ? 'CreditCard' : (card.icon || 'CreditCard')); setFormLogoPreview(card.icon?.startsWith('url:') ? card.icon.slice(4) : null); setIsModalOpen(true);
  };

  const handleCardLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formName) {
      toast({ title: 'Preencha o nome do cartão', variant: 'destructive' });
      return;
    }
    if (!formLimit) {
      toast({ title: 'Preencha o limite do cartão', variant: 'destructive' });
      return;
    }
    if (!formClosingDay) {
      toast({ title: 'Preencha o dia de fechamento', variant: 'destructive' });
      return;
    }
    if (!formDueDay) {
      toast({ title: 'Preencha o dia de vencimento', variant: 'destructive' });
      return;
    }
    if (!editingCard && !selectedEnvironmentId && !formEnvironmentId) {
      toast({ title: 'Selecione o ambiente do cartão', variant: 'destructive' });
      return;
    }
    const data = {
      name: formName, credit_limit: parseInt(formLimit, 10) / 100, closing_day: Number(formClosingDay), due_day: Number(formDueDay), color: formColor, icon: formLogoPreview ? `url:${formLogoPreview}` : formIcon, is_active: true,
      ...(!editingCard && !selectedEnvironmentId && formEnvironmentId ? { environment_id: formEnvironmentId } : {}),
    };
    if (editingCard) { await updateCreditCard({ id: editingCard.id, updates: data }); } else { await addCreditCard(data); }
    setIsModalOpen(false);
  };

  const prevCard = () => setActiveCardIndex(i => Math.max(0, i - 1));
  const nextCard = () => setActiveCardIndex(i => Math.min(creditCards.length - 1, i + 1));

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cartões</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Cartão</span>
        </Button>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        showType
        showStatus
        showCategory
        showTag
      />

      {creditCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
            <Button onClick={openAddModal} variant="outline" className="mt-4">Adicionar primeiro cartão</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Featured Card Display */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[340px]">
              {activeCard && (
                <>
                  <CreditCardDisplay
                    card={activeCard}
                    currentUsage={activeInvoice}
                    daysUntilDue={daysUntilDue}
                    onClick={() => openEditModal(activeCard)}
                  />
                  <EnvironmentBadge environments={environments} environmentId={activeCard.environment_id} className="mt-2 mx-auto" />
                </>
              )}
            </div>

            {/* Pagination dots */}
            {creditCards.length > 1 && (
              <div className="flex items-center gap-3 mt-4">
                <button onClick={prevCard} disabled={activeCardIndex === 0} className="text-muted-foreground disabled:opacity-30">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-1.5">
                  {creditCards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCardIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === activeCardIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <button onClick={nextCard} disabled={activeCardIndex === creditCards.length - 1} className="text-muted-foreground disabled:opacity-30">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {activeCard && (() => {
            const today = new Date();
            const closingDay = activeCard.closing_day;
            // Invoice can be paid after it closes (closing_day).
            // Before closing_day, the invoice is still open and cannot be paid.
            // After closing_day (including overdue), payment is always allowed.
            const canPay = today.getDate() > closingDay || activeInvoice === 0;
            return (
              <div className="flex items-center justify-center gap-6">
                <button onClick={async () => { await updateCreditCard({ id: activeCard.id, updates: { is_active: !activeCard.is_active } }); toast({ title: activeCard.is_active ? 'Cartão congelado' : 'Cartão ativado' }); }} className="flex flex-col items-center gap-1.5 group">
                  <div className="h-11 w-11 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Snowflake className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{activeCard.is_active ? 'Congelar' : 'Ativar'}</span>
                </button>
                <button onClick={() => openEditModal(activeCard)} className="flex flex-col items-center gap-1.5 group">
                  <div className="h-11 w-11 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Detalhes</span>
                </button>
                <button
                  onClick={() => { if (!canPay) { toast({ title: `Fatura ainda aberta — fecha dia ${closingDay}`, variant: 'destructive' }); return; } setPayAccountId(''); setPayDate(new Date().toISOString().split('T')[0]); setIsPayInvoiceOpen(true); }}
                  className={`flex flex-col items-center gap-1.5 group ${!canPay ? 'opacity-40' : ''}`}
                >
                  <div className="h-11 w-11 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Banknote className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Pagar</span>
                  {!canPay && <span className="text-[9px] text-muted-foreground">Fecha dia {closingDay}</span>}
                </button>
              </div>
            );
          })()}

          {/* Period Spending Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{periodChartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {periodSpending.labels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período</p>
              ) : (
                <div className="flex items-end justify-between gap-1 h-32">
                  {periodSpending.labels.map((label, i) => {
                    const height = maxPeriod > 0 ? (periodSpending.data[i] / maxPeriod) * 100 : 0;
                    const hasValue = periodSpending.data[i] > 0;
                    return (
                      <div key={`${label}-${i}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <span className="text-[9px] text-muted-foreground truncate w-full text-center">{hasValue ? formatCurrency(periodSpending.data[i]) : ''}</span>
                        <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                          <div
                            className={`w-full max-w-[28px] rounded-t-md transition-all ${hasValue ? 'gradient-bg' : 'bg-muted/50'}`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground truncate w-full text-center">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard title="Fatura Atual" value={activeInvoice} icon={<CreditCard className="h-4 w-4 text-destructive" />} techGrid={false} />
            <StatCard title="Disponível" value={activeAvailable} icon={<CreditCard className="h-4 w-4 text-green-500" />} techGrid={false} />
            <StatCard title="Gastos no Período" value={activePeriodUsage} icon={<CreditCard className="h-4 w-4 text-primary" />} techGrid={false} />
          </div>

          {/* Card Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transações do Cartão</CardTitle>
            </CardHeader>
            <CardContent>
              {cardTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação no período</p>
              ) : (
                <div className="space-y-2.5">
                  {cardTransactions.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-1">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.category?.bg || '#F5F5F5' }}>
                        <LucideIcon name={t.category?.icon || 'MoreHorizontal'} className="h-4 w-4" style={{ color: t.category?.color || '#9E9E9E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || t.category?.name || 'Transação'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                          {t.installment_total && ` · ${t.installment_current}/${t.installment_total}x`}
                        </p>
                        <EnvironmentBadge environments={environments} environmentId={t.environment_id} className="mt-0.5" />
                      </div>
                      <p className="text-sm font-medium text-destructive">{formatCurrency(Number(t.amount))}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices / Faturas */}
          {activeCard && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Faturas</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const cardInvoiceMonths: { month: number; year: number; total: number; status: string }[] = [];
                  // Build invoice data from transactions grouped by month
                  const txnsByMonth: Record<string, number> = {};
                  transactions
                    .filter(t => t.card_id === activeCard.id && isCardPurchase(t))
                    .forEach(t => {
                      const d = new Date(t.date);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      txnsByMonth[key] = (txnsByMonth[key] || 0) + Number(t.amount);
                    });

                  // Add invoices from hook
                  const cardInvs = invoices.filter(i => i.card_id === activeCard.id);
                  const allKeys = new Set([
                    ...Object.keys(txnsByMonth),
                    ...cardInvs.map(i => `${i.year}-${String(i.month).padStart(2, '0')}`),
                  ]);

                  Array.from(allKeys).sort().reverse().forEach(key => {
                    const [y, m] = key.split('-').map(Number);
                    const inv = cardInvs.find(i => i.month === m && i.year === y);
                    cardInvoiceMonths.push({
                      month: m,
                      year: y,
                      total: txnsByMonth[key] || 0,
                      status: inv?.status || (m === now.getMonth() + 1 && y === now.getFullYear() ? 'open' : 'closed'),
                    });
                  });

                  if (cardInvoiceMonths.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma fatura encontrada</p>;
                  }

                  return (
                    <div className="space-y-2">
                      {cardInvoiceMonths.slice(0, 12).map((inv) => {
                        const isCurrent = inv.month === now.getMonth() + 1 && inv.year === now.getFullYear();
                        const statusLabel = inv.status === 'paid' ? 'Paga' : inv.status === 'open' || isCurrent ? 'Aberta' : 'Fechada';
                        const statusColor = inv.status === 'paid' ? 'text-green-500' : isCurrent ? 'text-primary' : 'text-muted-foreground';
                        return (
                          <div key={`${inv.year}-${inv.month}`} className={`flex items-center gap-3 p-3 rounded-xl ${isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-muted/20'}`}>
                            <div className="flex-1">
                              <p className="text-sm font-medium capitalize">
                                {new Date(inv.year, inv.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </p>
                              <p className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</p>
                            </div>
                            <p className={`text-sm font-bold ${inv.total > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {formatCurrency(inv.total)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Environment selector - only when creating and viewing all environments */}
            {!editingCard && !selectedEnvironmentId && environments.length > 1 && (
              <div>
                <Label>Ambiente</Label>
                <Select value={formEnvironmentId} onValueChange={setFormEnvironmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        <div className="flex items-center gap-2">
                          {env.avatar_url ? (
                            <img src={env.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                          ) : (
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} />
                          )}
                          <span>{env.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Avatar/Logo no topo */}
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group relative">
                {formLogoPreview ? (
                  <img src={formLogoPreview} alt="Logo" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border/30 group-hover:ring-primary/50 transition-all" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center ring-2 ring-border/30 group-hover:ring-primary/50 transition-all" style={{ backgroundColor: formColor + '1A' }}>
                    <LucideIcon name={formIcon} className="h-7 w-7" style={{ color: formColor }} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
                  <Plus className="h-3 w-3" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleCardLogoSelect} />
              </label>
              {formLogoPreview ? (
                <button type="button" onClick={() => setFormLogoPreview(null)} className="text-[11px] text-destructive hover:underline">
                  Remover logo
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground">Toque para enviar logo</p>
              )}
            </div>

            <div><Label>Nome</Label><Input placeholder="Ex: Nubank Gold..." value={formName} onChange={(e) => setFormName(e.target.value)} /></div>

            {!formLogoPreview && (
              <div>
                <Label>Ícone</Label>
                <IconPicker value={formIcon} onChange={setFormIcon} />
              </div>
            )}

            <div><Label>Limite (R$)</Label><Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(formLimit)} onChange={(e) => handleCurrencyChange(e, setFormLimit)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dia Fechamento</Label><Input type="number" min="1" max="31" placeholder="15" value={formClosingDay} onChange={(e) => setFormClosingDay(e.target.value)} /></div>
              <div><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" placeholder="25" value={formDueDay} onChange={(e) => setFormDueDay(e.target.value)} /></div>
            </div>
            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />
            <Button onClick={handleSubmit} className="w-full">{editingCard ? 'Salvar' : 'Criar Cartão'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Invoice Dialog */}
      <Dialog open={isPayInvoiceOpen} onOpenChange={setIsPayInvoiceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar Fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeCard && (
              <div className="p-3 rounded-xl bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Valor da fatura</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(activeInvoice)}</p>
                <p className="text-xs text-muted-foreground">{activeCard.name}</p>
              </div>
            )}
            <div>
              <Label>Pagar com</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.is_active).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de pagamento</Label>
              <DatePicker value={payDate} onChange={setPayDate} />
            </div>
            <Button
              className="w-full"
              disabled={!payAccountId}
              onClick={async () => {
                if (!activeCard || !payAccountId) return;
                await addTransaction({
                  type: 'expense',
                  amount: activeInvoice,
                  description: `Pagamento fatura ${activeCard.name}`,
                  date: payDate,
                  category_id: null,
                  account_id: payAccountId,
                  card_id: activeCard.id,
                  notes: 'Pagamento de fatura via cartão',
                  status: 'paid',
                  paid_at: payDate + 'T00:00:00Z',
                  recurrence_group_id: null,
                  is_recurring: false,
                  recurrence_type: null,
                  installment_total: null,
                  installment_current: null,
                  registered_via: 'web',
                  tags: null,
                  invoice_id: null,
                } as any);
                setIsPayInvoiceOpen(false);
                toast({ title: 'Fatura paga com sucesso!' });
              }}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
