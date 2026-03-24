import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAccountsData } from '@/hooks/useAccountsData';
import { formatCurrency, Account, AccountType, accountTypeLabels } from '@/types/savedin';
import { Plus, Wallet, Building2, PiggyBank, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { TechGridPattern } from '@/components/ui/TechGridPattern';

const typeIcons: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  checking: Building2,
  savings: PiggyBank,
  wallet: Wallet,
  investment: TrendingUp,
};

export function AccountsView() {
  const { accounts, totalBalance, addAccount, updateAccount, deleteAccount } = useAccountsData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('checking');
  const [formBalance, setFormBalance] = useState('');
  const [formColor, setFormColor] = useState('#4CAF50');

  const openAddModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormType('checking');
    setFormBalance('');
    setFormColor('#4CAF50');
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(String(account.balance));
    setFormColor(account.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) return;

    const data = {
      name: formName,
      type: formType,
      balance: Number(formBalance) || 0,
      color: formColor,
      icon: typeIcons[formType] ? formType : 'Wallet',
      is_active: true,
    };

    if (editingAccount) {
      await updateAccount({ id: editingAccount.id, updates: data });
    } else {
      await addAccount(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await updateAccount({ id, updates: { is_active: false } });
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contas</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 relative overflow-hidden">
        <TechGridPattern position="top-right" size={120} opacity={0.12} />
        <CardContent className="p-6 relative z-10">
          <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">{accounts.filter(a => a.is_active).length} contas ativas</p>
        </CardContent>
      </Card>

      {/* Account List */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
            <Button onClick={openAddModal} variant="outline" className="mt-4">
              Adicionar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const Icon = typeIcons[account.type] || Wallet;
            return (
              <Card key={account.id} className={`${!account.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: account.color + '20' }}
                    >
                      <Icon className="h-6 w-6" style={{ color: account.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{accountTypeLabels[account.type]}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatCurrency(Number(account.balance))}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(account.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
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
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Nubank, Itaú..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(accountTypeLabels) as AccountType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {accountTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Saldo Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
              />
            </div>

            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />

            <Button onClick={handleSubmit} className="w-full">
              {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
        title="Desativar conta?"
        description="A conta será desativada. Transações existentes serão mantidas."
        confirmLabel="Desativar"
        onConfirm={() => { if (confirmDeleteId) updateAccount({ id: confirmDeleteId, updates: { is_active: false } }); setConfirmDeleteId(null); }}
      />
    </div>
  );
}
