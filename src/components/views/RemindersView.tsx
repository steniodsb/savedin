import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Check, Clock, MoreVertical, Trash2, Edit, Pause, Play } from 'lucide-react';
import { useRemindersData, Reminder } from '@/hooks/useRemindersData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreateReminderForm } from '@/components/reminders/CreateReminderForm';
import { EditReminderForm } from '@/components/reminders/EditReminderForm';
import { ReminderDetailView } from '@/components/reminders/ReminderDetailView';
import { SwipeableItem } from '@/components/ui/SwipeableItem';

import { Icon3D } from '@/components/ui/icon-picker';

export function RemindersView() {
  const { reminders, isLoading, completeReminder, deleteReminder, updateReminder, canCompleteToday } = useRemindersData();
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  const handleComplete = async (id: string) => {
    await completeReminder(id);
  };

  const handleToggleActive = async (reminder: Reminder) => {
    await updateReminder({
      id: reminder.id,
      updates: { isActive: !reminder.isActive }
    });
  };

  const getFrequencyLabel = (frequency: string, customDays?: number[]) => {
    switch (frequency) {
      case 'once': return 'Uma vez';
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'custom': 
        if (customDays?.length) {
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return customDays.map(d => days[d]).join(', ');
        }
        return 'Personalizado';
      default: return frequency;
    }
  };

  const activeReminders = reminders.filter(r => r.isActive);
  const pausedReminders = reminders.filter(r => !r.isActive);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky sticky-safe-top z-10 py-4 -mx-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Lembretes</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum lembrete criado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Crie lembretes para não esquecer de nada importante.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Criar primeiro lembrete
            </Button>
          </div>
        ) : (
          <>
            {/* Active Reminders */}
            {activeReminders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Ativos ({activeReminders.length})
                </h2>
                <AnimatePresence>
                  {activeReminders.map((reminder) => (
                    <SwipeableItem
                      key={reminder.id}
                      onDelete={() => deleteReminder(reminder.id)}
                    >
                      <ReminderCard
                        reminder={reminder}
                        canComplete={canCompleteToday(reminder)}
                        onComplete={() => handleComplete(reminder.id)}
                        onClick={() => setSelectedReminder(reminder)}
                        onEdit={() => setEditingReminder(reminder)}
                        onToggleActive={() => handleToggleActive(reminder)}
                        onDelete={() => deleteReminder(reminder.id)}
                      />
                    </SwipeableItem>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Paused Reminders */}
            {pausedReminders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pausados ({pausedReminders.length})
                </h2>
                <AnimatePresence>
                  {pausedReminders.map((reminder) => (
                    <SwipeableItem
                      key={reminder.id}
                      onDelete={() => deleteReminder(reminder.id)}
                    >
                      <ReminderCard
                        reminder={reminder}
                        canComplete={false}
                        onComplete={() => {}}
                        onClick={() => setSelectedReminder(reminder)}
                        onEdit={() => setEditingReminder(reminder)}
                        onToggleActive={() => handleToggleActive(reminder)}
                        onDelete={() => deleteReminder(reminder.id)}
                      />
                    </SwipeableItem>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de criação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>
          <CreateReminderForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de edição */}
      <Dialog open={!!editingReminder} onOpenChange={(open) => !open && setEditingReminder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar Lembrete</DialogTitle>
          </DialogHeader>
          {editingReminder && (
            <EditReminderForm
              reminder={editingReminder}
              onSuccess={() => setEditingReminder(null)}
              onCancel={() => setEditingReminder(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Visualização detalhada */}
      {selectedReminder && (
        <ReminderDetailView
          reminder={selectedReminder}
          open={!!selectedReminder}
          onOpenChange={(open) => !open && setSelectedReminder(null)}
        />
      )}
    </div>
  );
}

interface ReminderCardProps {
  reminder: Reminder;
  canComplete: boolean;
  onComplete: () => void;
  onClick: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function ReminderCard({ reminder, canComplete, onComplete, onClick, onEdit, onToggleActive, onDelete }: ReminderCardProps) {
  const progressPercent = reminder.totalDays 
    ? Math.round((reminder.totalCompletions / reminder.totalDays) * 100) 
    : 0;

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canComplete && reminder.isActive) {
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className={`bg-card/50 backdrop-blur-md border border-border/10 rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors ${!reminder.isActive ? 'opacity-20 grayscale' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon and Complete Button */}
        <button
          onClick={handleIconClick}
          disabled={!canComplete || !reminder.isActive}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
            canComplete && reminder.isActive
              ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer'
              : 'bg-muted cursor-default'
          } ${!canComplete && reminder.isActive ? 'ring-2 ring-green-500/50' : ''}`}
        >
          {!canComplete && reminder.isActive ? (
            <Check className="h-6 w-6 text-green-500" />
          ) : (
            <Icon3D icon={reminder.icon} size="lg" fallback="🔔" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground truncate">{reminder.title}</h3>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {reminder.timeOfDay.slice(0, 5)}
            </span>
            {reminder.totalDays && (
              <span className="font-medium">
                {reminder.totalCompletions}/{reminder.totalDays}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {reminder.totalDays && (
            <div className="mt-2">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(); }}>
              {reminder.isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
