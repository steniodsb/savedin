import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/textarea';
import { useInvestmentsData } from '@/hooks/useInvestmentsData';
import { formatCurrency, Investment, InvestmentType, InvestmentEntryType, investmentTypeLabels } from '@/types/savedin';
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Pencil, Trash2, X, DollarSign, Activity, Shield, Umbrella, Briefcase, Bitcoin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/finance/StatCard';
import { SparklineChart } from '@/components/finance/SparklineChart';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { toast } from '@/hooks/use-toast';
import { formatCurrencyInput, handleCurrencyChange, valueToCents } from '@/utils/currencyInput';
import { EnvironmentBadge } from '@/components/shared/EnvironmentBadge';

const typeIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Bitcoin, TrendingUp, Shield, Umbrella, Activity, Briefcase,
};

export function InvestmentsView() {
  const {
    investments, entries, totalPatrimony, totalInvested, totalYield,
    totalYieldPercent, monthlyYield, getEntriesForInvestment,
    addInvestment, updateInvestment, deleteInvestment, addEntry,
  } = useInvestmentsData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<InvestmentType>('stocks');
  const [formInitialValue, setFormInitialValue] = useState('');

  // Entry form
  const [entryType, setEntryType] = useState<InvestmentEntryType>('deposit');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryNotes, setEntryNotes] = useState('');

  // Update value form
  const [isUpdateValueOpen, setIsUpdateValueOpen] = useState(false);
  const [updateValue, setUpdateValue] = useState('');

  const openCreateModal = () => {
    setEditingInvestment(null);
    setFormName(''); setFormType('stocks'); setFormInitialValue('');
    setIsCreateOpen(true);
  };

  const openEditModal = (inv: Investment) => {
    setEditingInvestment(inv);
    setFormName(inv.name); setFormType(inv.type);
    setIsCreateOpen(true);
  };

  const openEntryModal = (inv: Investment, type: InvestmentEntryType) => {
    setSelectedInvestment(inv);
    setEntryType(type); setEntryAmount(''); setEntryDate(new Date().toISOString().split('T')[0]); setEntryNotes('');
    setIsEntryOpen(true);
  };

  const openUpdateValue = (inv: Investment) => {
    setSelectedInvestment(inv);
    setUpdateValue(valueToCents(Number(inv.current_value)));
    setIsUpdateValueOpen(true);
  };

  const handleCreate = async () => {
    if (!formName) {
      toast({ title: 'Preencha o nome do investimento', variant: 'destructive' });
      return;
    }
    const typeConfig = investmentTypeLabels[formType];
    const initial = formInitialValue ? (parseInt(formInitialValue, 10) / 100) : 0;

    if (editingInvestment) {
      await updateInvestment({ id: editingInvestment.id, updates: { name: formName, type: formType, color: typeConfig.color, icon: typeConfig.icon } });
    } else {
      const inv = await addInvestment({
        environment_id: '',
        name: formName, type: formType, invested_amount: initial, current_value: initial,
        color: typeConfig.color, icon: typeConfig.icon, is_active: true,
      });
      // If initial value, create a deposit entry
      if (initial > 0 && inv) {
        await addEntry({
          environment_id: '', investment_id: inv.id, type: 'deposit',
          amount: initial, date: new Date().toISOString().split('T')[0], notes: 'Aporte inicial',
        });
      }
    }
    setIsCreateOpen(false);
  };

  const handleEntry = async () => {
    if (!selectedInvestment) return;
    if (!entryAmount || parseInt(entryAmount, 10) <= 0) {
      toast({ title: 'Preencha o valor', variant: 'destructive' });
      return;
    }
    await addEntry({
      environment_id: '', investment_id: selectedInvestment.id,
      type: entryType, amount: parseInt(entryAmount, 10) / 100, date: entryDate, notes: entryNotes || null,
    });
    setIsEntryOpen(false);
    setSelectedInvestment(null);
  };

  const handleUpdateValue = async () => {
    if (!selectedInvestment) return;
    await updateInvestment({ id: selectedInvestment.id, updates: { current_value: updateValue ? (parseInt(updateValue, 10) / 100) : 0 } });
    setIsUpdateValueOpen(false);
    setSelectedInvestment(null);
  };

  // Detail view
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailInv = investments.find(i => i.id === detailId);
  const detailEntries = detailId ? getEntriesForInvestment(detailId) : [];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
        <Button onClick={openCreateModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Investimento</span>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Patrimônio" value={totalPatrimony}
          icon={<div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center"><Wallet className="h-4 w-4 text-white" /></div>}
        />
        <StatCard title="Total Investido" value={totalInvested}
          icon={<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-4 w-4 text-primary" /></div>}
          techGrid={false}
        />
        <StatCard title="Rendimento Total" value={totalYield}
          variation={totalYieldPercent} techGrid={false}
          icon={<div className={`h-9 w-9 rounded-xl ${totalYield >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'} flex items-center justify-center`}>
            {totalYield >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>}
        />
        <StatCard title="Rendimento Mês" value={monthlyYield} techGrid={false}
          icon={<div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Activity className="h-4 w-4 text-amber-500" /></div>}
        />
      </div>

      {/* Detail View */}
      {detailInv ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setDetailId(null)}><X className="h-5 w-5" /></Button>
            <h2 className="text-lg font-semibold">{detailInv.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50">{investmentTypeLabels[detailInv.type].label}</span>
          </div>

          <Card className="relative overflow-hidden">
            <TechGridPattern position="top-right" size={100} opacity={0.08} />
            <CardContent className="p-5 relative z-10">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Investido</p>
                  <p className="text-lg font-bold">{formatCurrency(Number(detailInv.invested_amount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Atual</p>
                  <p className="text-lg font-bold">{formatCurrency(Number(detailInv.current_value))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rendimento</p>
                  {(() => {
                    const yld = Number(detailInv.current_value) - Number(detailInv.invested_amount);
                    const pct = Number(detailInv.invested_amount) > 0 ? (yld / Number(detailInv.invested_amount)) * 100 : 0;
                    return (
                      <p className={`text-lg font-bold ${yld >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                        {yld >= 0 ? '+' : ''}{formatCurrency(yld)} ({pct.toFixed(1)}%)
                      </p>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openEntryModal(detailInv, 'deposit')} className="gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-green-500" /> Aporte
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEntryModal(detailInv, 'withdraw')} className="gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-destructive" /> Resgate
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEntryModal(detailInv, 'yield')} className="gap-1.5">
              <TrendingUp className="h-4 w-4 text-amber-500" /> Rendimento
            </Button>
            <Button size="sm" variant="outline" onClick={() => openUpdateValue(detailInv)} className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Atualizar Valor
            </Button>
          </div>

          {/* Entries list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {detailEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação</p>
              ) : (
                <div className="space-y-2.5">
                  {detailEntries.map(e => (
                    <div key={e.id} className="flex items-center gap-3 py-1">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        e.type === 'deposit' ? 'bg-green-500/10' : e.type === 'withdraw' ? 'bg-destructive/10' : 'bg-amber-500/10'
                      }`}>
                        {e.type === 'deposit' ? <ArrowUpRight className="h-4 w-4 text-green-500" /> :
                         e.type === 'withdraw' ? <ArrowDownRight className="h-4 w-4 text-destructive" /> :
                         <TrendingUp className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {e.type === 'deposit' ? 'Aporte' : e.type === 'withdraw' ? 'Resgate' : 'Rendimento'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.date).toLocaleDateString('pt-BR')}
                          {e.notes && ` · ${e.notes}`}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${
                        e.type === 'withdraw' ? 'text-destructive' : 'text-green-500'
                      }`}>
                        {e.type === 'withdraw' ? '-' : '+'}{formatCurrency(Number(e.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Investment Grid */}
          {investments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum investimento cadastrado</p>
                <Button onClick={openCreateModal} variant="outline" className="mt-4">Criar primeiro investimento</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {investments.map(inv => {
                const yld = Number(inv.current_value) - Number(inv.invested_amount);
                const pct = Number(inv.invested_amount) > 0 ? (yld / Number(inv.invested_amount)) * 100 : 0;
                const invEntries = getEntriesForInvestment(inv.id);
                const sparkData = invEntries
                  .filter(e => e.type === 'yield')
                  .slice(0, 12)
                  .reverse()
                  .map(e => Number(e.amount));

                return (
                  <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden" onClick={() => setDetailId(inv.id)}>
                    <TechGridPattern position="top-right" size={70} opacity={0.06} />
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: inv.color + '20' }}>
                            {(() => {
                              const Icon = typeIcons[investmentTypeLabels[inv.type].icon] || TrendingUp;
                              return <Icon className="h-4 w-4" style={{ color: inv.color }} />;
                            })()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{inv.name}</p>
                            <p className="text-[10px] text-muted-foreground">{investmentTypeLabels[inv.type].label}</p>
                            <EnvironmentBadge environmentId={inv.environment_id} className="mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditModal(inv); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(inv.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xl font-bold">{formatCurrency(Number(inv.current_value))}</p>

                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${yld >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {yld >= 0 ? '+' : ''}{formatCurrency(yld)} ({pct.toFixed(1)}%)
                        </span>
                        {sparkData.length > 1 && (
                          <SparklineChart data={sparkData} width={60} height={24} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent entries */}
          {entries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Movimentações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {entries.slice(0, 10).map(e => {
                    const inv = investments.find(i => i.id === e.investment_id);
                    return (
                      <div key={e.id} className="flex items-center gap-3 py-1">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          e.type === 'deposit' ? 'bg-green-500/10' : e.type === 'withdraw' ? 'bg-destructive/10' : 'bg-amber-500/10'
                        }`}>
                          {e.type === 'deposit' ? <ArrowUpRight className="h-4 w-4 text-green-500" /> :
                           e.type === 'withdraw' ? <ArrowDownRight className="h-4 w-4 text-destructive" /> :
                           <TrendingUp className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{inv?.name || 'Investimento'}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.type === 'deposit' ? 'Aporte' : e.type === 'withdraw' ? 'Resgate' : 'Rendimento'}
                            {' · '}{new Date(e.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold ${e.type === 'withdraw' ? 'text-destructive' : 'text-green-500'}`}>
                          {e.type === 'withdraw' ? '-' : '+'}{formatCurrency(Number(e.amount))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create/Edit Investment Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Bitcoin, Tesouro Selic, Nubank..." value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as InvestmentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(investmentTypeLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editingInvestment && (
              <div>
                <Label>Valor Inicial (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(formInitialValue)} onChange={(e) => handleCurrencyChange(e, setFormInitialValue)} />
              </div>
            )}
            <Button onClick={handleCreate} className="w-full">
              {editingInvestment ? 'Salvar' : 'Criar Investimento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Modal (Aporte/Resgate/Rendimento) */}
      <Dialog open={isEntryOpen} onOpenChange={setIsEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {entryType === 'deposit' ? 'Aporte' : entryType === 'withdraw' ? 'Resgate' : 'Rendimento'}
              {selectedInvestment && ` — ${selectedInvestment.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(entryAmount)} onChange={(e) => handleCurrencyChange(e, setEntryAmount)} className="text-xl font-bold" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea placeholder="Observações..." value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleEntry} className="w-full">Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Value Modal */}
      <Dialog open={isUpdateValueOpen} onOpenChange={setIsUpdateValueOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atualizar Valor Atual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor Atual (R$)</Label>
              <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(updateValue)} onChange={(e) => handleCurrencyChange(e, setUpdateValue)} className="text-xl font-bold" />
            </div>
            <Button onClick={handleUpdateValue} className="w-full">Atualizar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
        title="Deletar investimento?"
        description="Todas as movimentações serão removidas."
        onConfirm={() => { if (confirmDeleteId) deleteInvestment(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </div>
  );
}
