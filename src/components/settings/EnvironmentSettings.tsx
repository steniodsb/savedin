import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { Environment } from '@/types/savedin';
import { Plus, Pencil, Trash2, Shield, Briefcase, Home, Building2, User, Store, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const defaultColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B', '#009688', '#3F51B5', '#FF5722', '#E91E63'];
const iconOptions = [
  { value: 'User', label: 'Pessoal', Icon: User },
  { value: 'Briefcase', label: 'Empresa', Icon: Briefcase },
  { value: 'Home', label: 'Casa', Icon: Home },
  { value: 'Building2', label: 'Escritório', Icon: Building2 },
  { value: 'Store', label: 'Loja', Icon: Store },
  { value: 'Heart', label: 'Família', Icon: Heart },
];

export function EnvironmentSettings() {
  const { environments, addEnvironment, updateEnvironment, deleteEnvironment } = useEnvironmentsData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#4CAF50');
  const [formIcon, setFormIcon] = useState('Briefcase');

  const openAddModal = () => {
    setEditingEnv(null);
    setFormName(''); setFormColor('#2196F3'); setFormIcon('Briefcase');
    setIsModalOpen(true);
  };

  const openEditModal = (env: Environment) => {
    setEditingEnv(env);
    setFormName(env.name); setFormColor(env.color); setFormIcon(env.icon);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) return;
    if (editingEnv) {
      await updateEnvironment({ id: editingEnv.id, updates: { name: formName, color: formColor, icon: formIcon } });
    } else {
      await addEnvironment({ name: formName, color: formColor, icon: formIcon, is_default: false });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEnvironment(id);
    setConfirmDelete(null);
  };

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(i => i.value === iconName);
    return found ? found.Icon : Briefcase;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{environments.length} ambientes</p>
        <Button onClick={openAddModal} size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ambiente
        </Button>
      </div>

      {environments.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum ambiente criado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {environments.map((env) => {
            const Icon = getIconComponent(env.icon);
            return (
              <div key={env.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: env.color + '20' }}
                >
                  <Icon className="h-5 w-5" style={{ color: env.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{env.name}</p>
                    {env.is_default && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Criado em {new Date(env.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(env)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!env.is_default && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDelete(env.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEnv ? 'Editar Ambiente' : 'Novo Ambiente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Pessoal, Empresa X, Casa..." value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {iconOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFormIcon(value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border-2 transition-all ${
                      formIcon === value ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: formColor + '20' }}>
                {(() => { const I = getIconComponent(formIcon); return <I className="h-4 w-4" style={{ color: formColor }} />; })()}
              </div>
              <span className="text-sm font-medium">{formName || 'Nome do ambiente'}</span>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editingEnv ? 'Salvar' : 'Criar Ambiente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deletar Ambiente?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os dados deste ambiente (contas, transações, cartões, etc.) serão removidos permanentemente.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} className="flex-1">Deletar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
