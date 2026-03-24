import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTransactionsData } from '@/hooks/useTransactionsData';
import { Category, CategoryType, formatCurrency } from '@/types/savedin';
import { Plus, Pencil, Archive, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, IconPicker } from '@/components/ui/LucideIcon';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function CategoriesView() {
  const { categories, expenseCategories, incomeCategories, addCategory, updateCategory, deleteCategory } = useSavedinCategories();
  const { transactions } = useTransactionsData();
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('expense');
  const [formIcon, setFormIcon] = useState('MoreHorizontal');
  const [formColor, setFormColor] = useState('#9E9E9E');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Spending per category this month
  const categorySpending = (catId: string) => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.category_id === catId &&
          d.getMonth() + 1 === currentMonth &&
          d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const displayCategories = (activeType === 'expense' ? expenseCategories : incomeCategories)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const totalSpent = displayCategories.reduce((sum, c) => sum + categorySpending(c.id), 0);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName(''); setFormType(activeType); setFormIcon('MoreHorizontal'); setFormColor('#9E9E9E');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name); setFormType(cat.type); setFormIcon(cat.icon); setFormColor(cat.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) return;
    const slug = formName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
    const data = { name: formName, slug, type: formType, icon: formIcon, color: formColor, bg: formColor + '1A', is_active: true };
    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, updates: data });
    } else {
      await addCategory(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Categoria</span>
        </Button>
      </div>

      {/* Type Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          <Button
            variant={activeType === 'expense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('expense')}
            className="gap-2"
          >
            <ArrowDownRight className="h-4 w-4" />
            Despesas ({expenseCategories.length})
          </Button>
          <Button
            variant={activeType === 'income' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('income')}
            className="gap-2"
          >
            <ArrowUpRight className="h-4 w-4" />
            Receitas ({incomeCategories.length})
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Category List */}
      {displayCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma categoria encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayCategories.map((cat) => {
            const spent = categorySpending(cat.id);
            const percentage = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;

            return (
              <Card
                key={cat.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditModal(cat)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <LucideIcon name={cat.icon} className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat.is_default ? 'Padrão do sistema' : 'Personalizada'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditModal(cat); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}>
                        <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {spent > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Este mês</span>
                        <span className={`text-xs font-medium ${activeType === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                          {formatCurrency(spent)}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1" />
                    </div>
                  )}
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
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome da categoria" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as CategoryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ícone</Label>
              <IconPicker value={formIcon} onChange={setFormIcon} />
            </div>
            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: formColor + '1A' }}>
                <LucideIcon name={formIcon} className="h-5 w-5" style={{ color: formColor }} />
              </div>
              <span className="text-sm font-medium">{formName || 'Nome da categoria'}</span>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editingCategory ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
