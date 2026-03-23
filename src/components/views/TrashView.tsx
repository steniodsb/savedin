import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertCircle, CheckSquare, Flame, Target, FolderKanban, LayoutList, Bell } from 'lucide-react';
import { useTrashData, DeletedItem, DeletedItemType } from '@/hooks/useTrashData';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const typeConfig: Record<DeletedItemType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  task: { label: 'Tarefa', icon: CheckSquare },
  habit: { label: 'Hábito', icon: Flame },
  goal: { label: 'Meta', icon: Target },
  project: { label: 'Projeto', icon: FolderKanban },
  routine: { label: 'Rotina', icon: LayoutList },
  reminder: { label: 'Lembrete', icon: Bell },
};

export function TrashView() {
  const { deletedItems, isLoading, restoreItem, permanentlyDelete, emptyTrash } = useTrashData();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const handleRestore = async (item: DeletedItem) => {
    await restoreItem({ id: item.id, type: item.type });
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    await permanentlyDelete({ id: item.id, type: item.type });
    setConfirmDeleteId(null);
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setConfirmEmptyTrash(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky sticky-safe-top z-10 py-4 -mx-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Lixeira</h1>
        </div>

        <div className="flex items-center gap-2">
          {deletedItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmEmptyTrash(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Esvaziar
            </Button>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Itens são excluídos automaticamente após 24 horas na lixeira.
        </AlertDescription>
      </Alert>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : deletedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Lixeira vazia</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Itens excluídos aparecerão aqui e poderão ser restaurados dentro de 24 horas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deletedItems.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {config.label}
                        </span>
                        <span className={`text-xs ${item.hours_remaining <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.time_remaining}
                        </span>
                      </div>
                      <p className="font-medium text-foreground truncate mt-1">{item.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const item = deletedItems.find(i => i.id === confirmDeleteId);
                if (item) handlePermanentDelete(item);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Empty Trash Dialog */}
      <AlertDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {deletedItems.length} itens serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive hover:bg-destructive/90"
            >
              Esvaziar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
