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
import { toast } from '@/hooks/use-toast';
import { formatCurrency, Account, AccountType, accountTypeLabels } from '@/types/savedin';
import { Plus, Wallet, Building2, PiggyBank, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { LucideIcon, IconPicker } from '@/components/ui/LucideIcon';
import { formatCurrencyInput, handleCurrencyChange, valueToCents } from '@/utils/currencyInput';
import { EnvironmentBadge } from '@/components/shared/EnvironmentBadge';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { useUIStore } from '@/store/useUIStore';

const typeIcons: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  checking: Building2,
  savings: PiggyBank,
  wallet: Wallet,
  investment: TrendingUp,
};

export function AccountsView() {
  const { accounts, totalBalance, addAccount, updateAccount, deleteAccount } = useAccountsData();
  const { environments, defaultEnvironment } = useEnvironmentsData();
  const { selectedEnvironmentId } = useUIStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('checking');
  const [formBalance, setFormBalance] = useState('');
  const [formColor, setFormColor] = useState('#4CAF50');
  const [formIcon, setFormIcon] = useState('Landmark');
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);
  const [formEnvironmentId, setFormEnvironmentId] = useState('');

  const openAddModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormType('checking');
    setFormBalance('');
    setFormColor('#4CAF50');
    setFormIcon('Landmark');
    setFormLogoPreview(null);
    setFormEnvironmentId(defaultEnvironment?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(valueToCents(Number(account.balance)));
    setFormColor(account.color);
    setFormIcon(account.icon?.startsWith('url:') ? 'Landmark' : (account.icon || 'Landmark'));
    setFormLogoPreview(account.icon?.startsWith('url:') ? account.icon.slice(4) : null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) {
      toast({ title: 'Preencha o nome da conta', variant: 'destructive' });
      return;
    }

    if (!editingAccount && !selectedEnvironmentId && !formEnvironmentId) {
      toast({ title: 'Selecione o ambiente da conta', variant: 'destructive' });
      return;
    }

    const data = {
      name: formName,
      type: formType,
      balance: (parseInt(formBalance, 10) / 100) || 0,
      color: formColor,
      icon: formLogoPreview ? `url:${formLogoPreview}` : formIcon,
      is_active: true,
      ...(!editingAccount && !selectedEnvironmentId && formEnvironmentId ? { environment_id: formEnvironmentId } : {}),
    };

    if (editingAccount) {
      await updateAccount({ id: editingAccount.id, updates: data });
    } else {
      await addAccount(data);
    }
    setIsModalOpen(false);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormLogoPreview(base64);
    };
    reader.readAsDataURL(file);
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
            return (
              <Card key={account.id} className={`${!account.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {account.icon?.startsWith('url:') ? (
                      <img src={account.icon.slice(4)} alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: account.color + '20' }}
                      >
                        <LucideIcon name={account.icon || 'Landmark'} className="h-6 w-6" style={{ color: account.color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{accountTypeLabels[account.type]}</p>
                      <EnvironmentBadge environmentId={account.environment_id} environments={environments} className="mt-0.5" />
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
            {/* Environment selector - only when creating and viewing all environments */}
            {!editingAccount && !selectedEnvironmentId && environments.length > 1 && (
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
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
              </label>
              {formLogoPreview ? (
                <button type="button" onClick={() => setFormLogoPreview(null)} className="text-[11px] text-destructive hover:underline">
                  Remover logo
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground">Toque para enviar logo</p>
              )}
            </div>

            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank, Itaú..." value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(accountTypeLabels) as AccountType[]).map((type) => (
                    <SelectItem key={type} value={type}>{accountTypeLabels[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formLogoPreview && (
              <div>
                <Label>Ícone</Label>
                <IconPicker value={formIcon} onChange={setFormIcon} />
              </div>
            )}

            <div>
              <Label>Saldo Inicial (R$)</Label>
              <Input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formatCurrencyInput(formBalance)} onChange={(e) => handleCurrencyChange(e, setFormBalance)} />
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
