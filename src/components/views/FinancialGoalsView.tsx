import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFinancialGoalsData } from '@/hooks/useFinancialGoalsData';
import { formatCurrency, FinancialGoal } from '@/types/savedin';
import { Plus, Target, Pencil, Trash2, TrendingUp, Check } from 'lucide-react';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { Progress } from '@/components/ui/progress';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { toast } from '@/hooks/use-toast';

const defaultIcons = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💰', '🏦', '🎁'];

export function FinancialGoalsView() {
  const { goals, activeGoals, completedGoals, totalSaved, totalTarget, addGoal, updateGoal, deleteGoal, depositToGoal } = useFinancialGoalsData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formIcon, setFormIcon] = useState('🎯');
  const [formColor, setFormColor] = useState('#4CAF50');
  const [depositAmount, setDepositAmount] = useState('');

  const openAddModal = () => {
    setEditingGoal(null);
    setFormName('');
    setFormTargetAmount('');
    setFormCurrentAmount('0');
    setFormDeadline('');
    setFormIcon('🎯');
    setFormColor('#4CAF50');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTargetAmount(String(goal.target_amount));
    setFormCurrentAmount(String(goal.current_amount));
    setFormDeadline(goal.deadline || '');
    setFormIcon(goal.icon);
    setFormColor(goal.color);
    setIsModalOpen(true);
  };

  const openDepositModal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setDepositAmount('');
    setIsDepositModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) {
      toast({ title: 'Preencha o nome do objetivo', variant: 'destructive' });
      return;
    }
    if (!formTargetAmount) {
      toast({ title: 'Preencha o valor alvo', variant: 'destructive' });
      return;
    }

    const data = {
      name: formName,
      target_amount: Number(formTargetAmount),
      current_amount: Number(formCurrentAmount) || 0,
      deadline: formDeadline || null,
      icon: formIcon,
      color: formColor,
      is_completed: false,
    };

    if (editingGoal) {
      await updateGoal({ id: editingGoal.id, updates: data });
    } else {
      await addGoal(data);
    }
    setIsModalOpen(false);
  };

  const handleDeposit = async () => {
    if (!selectedGoalId || !depositAmount || Number(depositAmount) <= 0) return;
    await depositToGoal({ id: selectedGoalId, amount: Number(depositAmount) });
    setIsDepositModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Objetivos</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Objetivo</span>
        </Button>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 relative overflow-hidden">
        <TechGridPattern position="top-right" size={120} opacity={0.12} />
        <CardContent className="p-6 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Poupado</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(totalSaved)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meta Total</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTarget)}</p>
            </div>
          </div>
          {totalTarget > 0 && (
            <div className="mt-3">
              <Progress value={(totalSaved / totalTarget) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((totalSaved / totalTarget) * 100).toFixed(1)}% do total
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Goals */}
      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum objetivo criado</p>
            <Button onClick={openAddModal} variant="outline" className="mt-4">
              Criar primeiro objetivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Em Andamento</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGoals.map((goal) => {
                  const percentage = Number(goal.target_amount) > 0
                    ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                    : 0;
                  const daysLeft = goal.deadline
                    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <Card key={goal.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{goal.icon}</span>
                            <div>
                              <p className="font-semibold text-foreground">{goal.name}</p>
                              {daysLeft !== null && (
                                <p className={`text-xs ${daysLeft < 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(goal)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGoal(goal.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-end justify-between mb-1">
                            <span className="text-sm font-medium">{formatCurrency(Number(goal.current_amount))}</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(Number(goal.target_amount))}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 text-right">{percentage.toFixed(1)}%</p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => openDepositModal(goal.id)}
                        >
                          <TrendingUp className="h-4 w-4" />
                          Depositar
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Concluídos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="opacity-75">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{goal.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold">{goal.name}</p>
                          <p className="text-sm text-green-500 flex items-center gap-1">
                            <Check className="h-4 w-4" /> {formatCurrency(Number(goal.target_amount))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Viagem, Carro novo..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>Valor Alvo (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formTargetAmount.replace('.', ',')}
                onChange={(e) => { let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''); const p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); setFormTargetAmount(v); }}
              />
            </div>

            <div>
              <Label>Valor Atual (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formCurrentAmount.replace('.', ',')}
                onChange={(e) => { let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''); const p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); setFormCurrentAmount(v); }}
              />
            </div>

            <div>
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
              />
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {defaultIcons.map((icon) => (
                  <button
                    key={icon}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all ${formIcon === icon ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30'}`}
                    onClick={() => setFormIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />

            <Button onClick={handleSubmit} className="w-full">
              {editingGoal ? 'Salvar Alterações' : 'Criar Objetivo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Depositar no Objetivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={depositAmount.replace('.', ',')}
                onChange={(e) => { let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''); const p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); setDepositAmount(v); }}
                className="text-xl font-bold"
              />
            </div>

            <Button onClick={handleDeposit} className="w-full">
              Depositar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
