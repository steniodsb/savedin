import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { formatCurrency, CreditCard as CreditCardType } from '@/types/savedin';
import { Plus, CreditCard, Pencil, Trash2, ChevronLeft, ChevronRight, Snowflake, FileText, Banknote } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CreditCardDisplay } from '@/components/finance/CreditCardDisplay';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { StatCard } from '@/components/finance/StatCard';
import { LucideIcon } from '@/components/ui/LucideIcon';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function CardsView() {
  const { creditCards, invoices, totalLimit, addCreditCard, updateCreditCard, deleteCreditCard } = useCreditCardsData();
  const { transactions } = useTransactionsData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formClosingDay, setFormClosingDay] = useState('');
  const [formDueDay, setFormDueDay] = useState('');
  const [formColor, setFormColor] = useState('#3F51B5');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Card usage
  const cardUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    creditCards.forEach(card => {
      usage[card.id] = transactions
        .filter(t => t.card_id === card.id && t.type === 'expense')
        .filter(t => { const d = new Date(t.date); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear; })
        .reduce((sum, t) => sum + Number(t.amount), 0);
    });
    return usage;
  }, [creditCards, transactions, currentMonth, currentYear]);

  const totalUsed = Object.values(cardUsage).reduce((s, v) => s + v, 0);

  // Weekly spending for chart
  const weeklySpending = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activeCard = creditCards[activeCardIndex];
    if (!activeCard) return { labels: days, data: [0, 0, 0, 0, 0, 0, 0] };

    const today = new Date();
    const data = days.map((_, dayIndex) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (today.getDay() - dayIndex));
      const dateStr = d.toISOString().split('T')[0];
      return transactions
        .filter(t => t.card_id === activeCard.id && t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    });
    return { labels: days, data };
  }, [creditCards, activeCardIndex, transactions]);

  const maxWeekly = Math.max(...weeklySpending.data, 1);
  const activeCard = creditCards[activeCardIndex];
  const activeUsage = activeCard ? cardUsage[activeCard.id] || 0 : 0;
  const activeAvailable = activeCard ? Number(activeCard.credit_limit) - activeUsage : 0;

  // Days until due
  const daysUntilDue = activeCard ? (() => {
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), activeCard.due_day);
    if (due < today) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  })() : undefined;

  // Card transactions
  const cardTransactions = activeCard
    ? transactions.filter(t => t.card_id === activeCard.id && t.type === 'expense')
        .filter(t => { const d = new Date(t.date); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear; })
    : [];

  const openAddModal = () => {
    setEditingCard(null); setFormName(''); setFormLimit(''); setFormClosingDay(''); setFormDueDay(''); setFormColor('#3F51B5'); setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCardType) => {
    setEditingCard(card); setFormName(card.name); setFormLimit(String(card.credit_limit)); setFormClosingDay(String(card.closing_day)); setFormDueDay(String(card.due_day)); setFormColor(card.color); setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName || !formLimit || !formClosingDay || !formDueDay) return;
    const data = { name: formName, credit_limit: Number(formLimit), closing_day: Number(formClosingDay), due_day: Number(formDueDay), color: formColor, icon: 'CreditCard', is_active: true };
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
                <CreditCardDisplay
                  card={activeCard}
                  currentUsage={activeUsage}
                  daysUntilDue={daysUntilDue}
                  onClick={() => openEditModal(activeCard)}
                />
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
          {activeCard && (
            <div className="flex items-center justify-center gap-6">
              {[
                { icon: Snowflake, label: 'Congelar', action: () => {} },
                { icon: FileText, label: 'Detalhes', action: () => openEditModal(activeCard) },
                { icon: Banknote, label: 'Pagar', action: () => {} },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} className="flex flex-col items-center gap-1.5 group">
                  <div className="h-11 w-11 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Weekly Spending Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gastos da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklySpending.labels.map((label, i) => {
                  const isToday = i === now.getDay();
                  const height = maxWeekly > 0 ? (weeklySpending.data[i] / maxWeekly) * 100 : 0;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{weeklySpending.data[i] > 0 ? formatCurrency(weeklySpending.data[i]) : ''}</span>
                      <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all ${isToday ? 'gradient-bg' : 'bg-muted/50'}`}
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Fatura Atual" value={activeUsage} icon={<CreditCard className="h-4 w-4 text-destructive" />} techGrid={false} />
            <StatCard title="Disponível" value={activeAvailable} icon={<CreditCard className="h-4 w-4 text-green-500" />} techGrid={false} />
          </div>

          {/* Card Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transações do Cartão</CardTitle>
            </CardHeader>
            <CardContent>
              {cardTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação este mês</p>
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
                      </div>
                      <p className="text-sm font-medium text-destructive">{formatCurrency(Number(t.amount))}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input placeholder="Ex: Nubank Gold..." value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div><Label>Limite (R$)</Label><Input type="number" step="0.01" min="0" placeholder="5000.00" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dia Fechamento</Label><Input type="number" min="1" max="31" placeholder="15" value={formClosingDay} onChange={(e) => setFormClosingDay(e.target.value)} /></div>
              <div><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" placeholder="25" value={formDueDay} onChange={(e) => setFormDueDay(e.target.value)} /></div>
            </div>
            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />
            <Button onClick={handleSubmit} className="w-full">{editingCard ? 'Salvar' : 'Criar Cartão'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
