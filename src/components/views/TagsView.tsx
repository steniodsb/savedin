import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTagsData } from '@/hooks/useTagsData';
import { Tag as TagType } from '@/types/savedin';
import { Plus, Pencil, Trash2, Hash, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function TagsView() {
  const { tags, addTag, updateTag, deleteTag } = useTagsData();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#9E9E9E');

  const filteredTags = tags.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const openAddModal = () => {
    setEditingTag(null); setFormName(''); setFormColor('#9E9E9E'); setIsModalOpen(true);
  };

  const openEditModal = (tag: TagType) => {
    setEditingTag(tag); setFormName(tag.name); setFormColor(tag.color); setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName) return;
    if (editingTag) {
      await updateTag({ id: editingTag.id, updates: { name: formName, color: formColor } });
    } else {
      await addTag({ name: formName, color: formColor });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tags</h1>
        <Button onClick={openAddModal} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Tag</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar tag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{tags.length} tags criadas</span>
      </div>

      {/* Tags Grid */}
      {filteredTags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Nenhuma tag encontrada' : 'Nenhuma tag criada'}
            </p>
            {!search && (
              <Button onClick={openAddModal} variant="outline" className="mt-4">
                Criar primeira tag
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tag.color + '20' }}
                  >
                    <Hash className="h-5 w-5" style={{ color: tag.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tag.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Criada em {new Date(tag.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(tag)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDeleteId(tag.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" style={{ borderColor: tag.color, color: tag.color }} className="text-xs">
                    #{tag.name}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome da tag" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />
            {/* Preview */}
            {formName && (
              <div>
                <Label>Preview</Label>
                <div className="mt-1">
                  <Badge variant="outline" style={{ borderColor: formColor, color: formColor }} className="text-sm">
                    #{formName}
                  </Badge>
                </div>
              </div>
            )}
            <Button onClick={handleSubmit} className="w-full">
              {editingTag ? 'Salvar' : 'Criar Tag'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
        title="Deletar tag?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => { if (confirmDeleteId) deleteTag(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </div>
  );
}
