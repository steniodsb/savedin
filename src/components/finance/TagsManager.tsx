import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTagsData } from '@/hooks/useTagsData';
import { Tag as TagType } from '@/types/savedin';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function TagsManager() {
  const { tags, addTag, updateTag, deleteTag } = useTagsData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#9E9E9E');

  const openAddModal = () => {
    setEditingTag(null);
    setFormName('');
    setFormColor('#9E9E9E');
    setIsModalOpen(true);
  };

  const openEditModal = (tag: TagType) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setIsModalOpen(true);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tags.length} tags</p>
        <Button onClick={openAddModal} size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-8">
          <Tags className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma tag criada</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id} className="group relative">
              <Badge
                variant="outline"
                className="cursor-pointer px-3 py-1.5 text-sm"
                style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => openEditModal(tag)}
              >
                {tag.name}
              </Badge>
              <button
                onClick={() => deleteTag(tag.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Nome da tag"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <ColorPicker value={formColor} onChange={setFormColor} label="Cor" />

            <Button onClick={handleSubmit} className="w-full">
              {editingTag ? 'Salvar' : 'Criar Tag'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
