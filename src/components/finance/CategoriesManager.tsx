import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { Category, CategoryType } from '@/types/savedin';
import { Plus, Pencil, Archive, Tag } from 'lucide-react';

const defaultColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B', '#009688', '#3F51B5', '#FF5722', '#795548'];
const defaultIcons = ['Home', 'ShoppingCart', 'Car', 'Heart', 'BookOpen', 'Shirt', 'CreditCard', 'TrendingUp', 'Briefcase', 'Laptop', 'PartyPopper', 'MoreHorizontal'];

export function CategoriesManager() {
  const { categories, expenseCategories, incomeCategories, addCategory, updateCategory, deleteCategory } = useSavedinCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeType, setActiveType] = useState<CategoryType>('expense');

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('expense');
  const [formIcon, setFormIcon] = useState('MoreHorizontal');
  const [formColor, setFormColor] = useState('#9E9E9E');

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormType(activeType);
    setFormIcon('MoreHorizontal');
    setFormColor('#9E9E9E');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    if (cat.is_default) return; // Can't edit default categories
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) return;

    const slug = formName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

    const data = {
      name: formName,
      slug,
      type: formType,
      icon: formIcon,
      color: formColor,
      bg: formColor + '1A', // 10% opacity
      is_active: true,
    };

    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, updates: data });
    } else {
      await addCategory(data);
    }
    setIsModalOpen(false);
  };

  const displayCategories = activeType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <div className="space-y-4">
      {/* Type Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeType === 'expense' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('expense')}
        >
          Despesas ({expenseCategories.length})
        </Button>
        <Button
          variant={activeType === 'income' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('income')}
        >
          Receitas ({incomeCategories.length})
        </Button>
        <Button onClick={openAddModal} size="sm" variant="outline" className="ml-auto gap-2">
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>

      {/* Category List */}
      <div className="space-y-2">
        {displayCategories.map((cat) => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors ${cat.is_default ? '' : 'cursor-pointer'}`}
            onClick={() => openEditModal(cat)}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: cat.bg }}
            >
              <span style={{ color: cat.color }} className="text-sm font-bold">●</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{cat.name}</p>
              {cat.is_default && <p className="text-xs text-muted-foreground">Padrão</p>}
            </div>
            {!cat.is_default && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditModal(cat); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}>
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Nome da categoria"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as CategoryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {defaultIcons.map((icon) => (
                  <button
                    key={icon}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm border-2 transition-all ${formIcon === icon ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30'}`}
                    onClick={() => setFormIcon(icon)}
                  >
                    <Tag className="h-4 w-4" />
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

            <Button onClick={handleSubmit} className="w-full">
              {editingCategory ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
