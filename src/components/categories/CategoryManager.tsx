import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, Edit2, Trash2, GripVertical, Save } from 'lucide-react';
import { useCategoriesData, CategoryType, Category } from '@/hooks/useCategoriesData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'sonner';
import { Icon3D } from '@/components/ui/icon-picker';

interface CategoryManagerProps {
  type: CategoryType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = [
  '📁', '📂', '⭐', '🌟', '💼', '💰', '💪', '❤️', '🎯', '🚀',
  '📚', '🏠', '✨', '⚡', '🧘', '👥', '🎨', '🎮', '🎵', '📱',
  '💻', '🔧', '📊', '📈', '🏆', '🎁', '🌱', '🔥', '💡', '🎓'
];

type FormMode = 'create' | 'edit' | null;

export function CategoryManager({ type, open, onOpenChange }: CategoryManagerProps) {
  const { 
    categories: allCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    reorderCategories,
    getItemCountForCategory,
    initializeDefaultCategories,
  } = useCategoriesData(type);

  const categories = allCategories.filter(c => c.type === type);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: Category; itemCount: number } | null>(null);
  const [moveToCategory, setMoveToCategory] = useState<string>('none');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    icon: '📁',
    color: '#3B82F6',
  });

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (open && categories.length === 0) {
      initializeDefaultCategories();
    }
  }, [open]);

  const typeLabels: Record<CategoryType, string> = {
    goal: 'Metas',
    task: 'Tarefas',
    habit: 'Hábitos',
    project: 'Projetos',
  };

  const handleOpenForm = (mode: 'create' | 'edit', category?: Category) => {
    setFormMode(mode);
    if (mode === 'edit' && category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon,
        color: category.color,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: '📁',
        color: '#3B82F6',
      });
    }
  };

  const handleCloseForm = () => {
    setFormMode(null);
    setEditingCategory(null);
    setFormData({ name: '', icon: '📁', color: '#3B82F6' });
    setShowColorPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      if (formMode === 'create') {
        await createCategory({ ...formData, type });
      } else if (formMode === 'edit' && editingCategory) {
        await updateCategory({ id: editingCategory.id, updates: formData });
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error submitting category:', error);
    }
  };

  const handleDeleteClick = async (category: Category) => {
    if (category.isSystem) {
      toast.error('Categorias do sistema não podem ser excluídas, apenas editadas');
      return;
    }

    const itemCount = await getItemCountForCategory(category.id, type);

    if (itemCount > 0) {
      setDeleteConfirm({ category, itemCount });
    } else {
      // No items, delete directly
      await deleteCategory({ id: category.id, moveToId: null });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    const moveTo = moveToCategory === 'none' ? null : moveToCategory;
    await deleteCategory({ id: deleteConfirm.category.id, moveToId: moveTo });

    setDeleteConfirm(null);
    setMoveToCategory('none');
  };

  const handleReorder = (newOrder: Category[]) => {
    setOrderedCategories(newOrder);
  };

  const handleSaveOrder = async () => {
    await reorderCategories(orderedCategories);
    toast.success('Ordem salva!');
  };

  const hasOrderChanged = JSON.stringify(orderedCategories.map(c => c.id)) !== 
                          JSON.stringify(categories.map(c => c.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Categorias de {typeLabels[type]}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Create button */}
            <Button onClick={() => handleOpenForm('create')} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>

            {/* Categories list (reorderable) */}
            {orderedCategories.length > 0 ? (
              <Reorder.Group 
                axis="y" 
                values={orderedCategories} 
                onReorder={handleReorder}
                className="space-y-2"
              >
                {orderedCategories.map((category) => (
                  <Reorder.Item
                    key={category.id}
                    value={category}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <Icon3D icon={category.icon} size="md" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{category.name}</p>
                      {category.isSystem && (
                        <p className="text-xs text-muted-foreground">Sistema</p>
                      )}
                    </div>

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenForm('edit', category);
                        }}
                        className="p-1.5 rounded-lg hover:bg-background transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {!category.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(category);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma categoria ainda</p>
              </div>
            )}

            {hasOrderChanged && (
              <Button onClick={handleSaveOrder} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Ordem
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={!!formMode} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Icon selector */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                      formData.icon === emoji
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Trabalho"
                required
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="text-sm font-mono">{formData.color}</span>
              </button>

              {showColorPicker && (
                <div className="p-3 rounded-xl border border-border bg-background">
                  <HexColorPicker
                    color={formData.color}
                    onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: formData.color + '20' }}
                >
                  {formData.icon}
                </div>
                <span className="font-medium">{formData.name || 'Nome da categoria'}</span>
                <div
                  className="w-3 h-3 rounded-full ml-auto"
                  style={{ backgroundColor: formData.color }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {formMode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Esta categoria tem <strong>{deleteConfirm?.itemCount}</strong>{' '}
                  {typeLabels[type].toLowerCase()} associados.
                </p>
                <p>O que deseja fazer com eles?</p>

                <Select value={moveToCategory} onValueChange={setMoveToCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Deixar sem categoria</SelectItem>
                    {categories
                      .filter(c => c.id !== deleteConfirm?.category.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
