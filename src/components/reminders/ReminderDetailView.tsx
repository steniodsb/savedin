import { useState, useEffect } from 'react';
import { format, subDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, Clock, Flame, Calendar, Check, X, Edit, Trash2, 
  Pause, Play, TrendingUp, Target, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Reminder, useRemindersData } from '@/hooks/useRemindersData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditReminderForm } from './EditReminderForm';
import { Icon3D } from '@/components/ui/icon-picker';

interface ReminderDetailViewProps {
  reminder: Reminder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReminderCompletion {
  id: string;
  completed_at: string;
  notes?: string;
}

export function ReminderDetailView({ reminder, open, onOpenChange }: ReminderDetailViewProps) {
  const { user } = useAuth();
  const { completeReminder, deleteReminder, updateReminder, canCompleteToday } = useRemindersData();
  const [completions, setCompletions] = useState<ReminderCompletion[]>([]);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (open && user) {
      loadCompletions();
    }
  }, [open, user, reminder.id]);

  const loadCompletions = async () => {
    if (!user) return;
    setIsLoadingCompletions(true);
    
    try {
      const { data, error } = await supabase
        .from('reminder_completions')
        .select('*')
        .eq('reminder_id', reminder.id)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingCompletions(false);
    }
  };

  const handleComplete = async () => {
    await completeReminder(reminder.id);
    loadCompletions();
  };

  const handleToggleActive = async () => {
    await updateReminder({
      id: reminder.id,
      updates: { isActive: !reminder.isActive }
    });
  };

  const handleDelete = async () => {
    await deleteReminder(reminder.id);
    onOpenChange(false);
  };

  const getFrequencyLabel = () => {
    switch (reminder.frequency) {
      case 'once': return 'Uma vez';
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'custom': 
        if (reminder.customDays?.length) {
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return reminder.customDays.map(d => days[d]).join(', ');
        }
        return 'Personalizado';
      default: return reminder.frequency;
    }
  };

  const progressPercent = reminder.totalDays 
    ? Math.round((reminder.totalCompletions / reminder.totalDays) * 100) 
    : 0;

  // Calendar data for the month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of week offset
  const firstDayOffset = monthStart.getDay();
  
  // Check if a day has a completion
  const hasCompletion = (date: Date) => {
    return completions.some(c => isSameDay(new Date(c.completed_at), date));
  };

  // Last 7 days streak visualization
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  if (showEditForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lembrete</DialogTitle>
          </DialogHeader>
          <EditReminderForm
            reminder={reminder}
            onSuccess={() => {
              setShowEditForm(false);
              loadCompletions();
            }}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header com ícone grande */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center border-b border-border">
          {/* Botão de fechar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 hover:bg-card"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="w-20 h-20 mx-auto rounded-2xl bg-card shadow-lg flex items-center justify-center mb-4">
            <Icon3D icon={reminder.icon} size="xl" fallback="🔔" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{reminder.title}</h2>
          {reminder.description && (
            <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
          )}
          
          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium ${
            reminder.isActive 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {reminder.isActive ? (
              <>
                <Play className="h-3 w-3" />
                Ativo
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                Pausado
              </>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Botão de completar */}
          {reminder.isActive && (
            <Button
              onClick={handleComplete}
              disabled={!canCompleteToday(reminder)}
              className="w-full h-14 text-lg rounded-xl"
              variant={canCompleteToday(reminder) ? "default" : "secondary"}
            >
              {canCompleteToday(reminder) ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Marcar como feito
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2 text-green-500" />
                  Já completado hoje!
                </>
              )}
            </Button>
          )}

          {/* Estatísticas principais */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Flame className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{reminder.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Sequência</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{reminder.longestStreak}</p>
              <p className="text-xs text-muted-foreground">Recorde</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <Target className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{reminder.totalCompletions}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Progresso (se tiver total de dias) */}
          {reminder.totalDays && (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Progresso</span>
                <span className="text-sm text-muted-foreground">
                  {reminder.totalCompletions}/{reminder.totalDays} dias
                </span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {progressPercent}% concluído
              </p>
            </div>
          )}

          {/* Últimos 7 dias */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Últimos 7 dias</h4>
            <div className="flex justify-between">
              {last7Days.map((day, index) => {
                const completed = hasCompletion(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                    </span>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        completed
                          ? 'bg-green-500 text-white'
                          : isToday
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      {completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {format(day, 'd')}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendário do mês */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h4 className="text-sm font-medium text-foreground capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {daysInMonth.map((day, index) => {
                const completed = hasCompletion(day);
                const isToday = isSameDay(day, new Date());
                const isFuture = day > new Date();
                
                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-md flex items-center justify-center text-xs ${
                      completed
                        ? 'bg-green-500 text-white font-medium'
                        : isToday
                        ? 'bg-primary text-primary-foreground font-medium'
                        : isFuture
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Informações */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Horário:</span>
              <span className="font-medium text-foreground">{reminder.timeOfDay.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Frequência:</span>
              <span className="font-medium text-foreground">{getFrequencyLabel()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Início:</span>
              <span className="font-medium text-foreground">
                {format(new Date(reminder.startDate), "d 'de' MMMM, yyyy", { locale: ptBR })}
              </span>
            </div>
            {reminder.endDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Término:</span>
                <span className="font-medium text-foreground">
                  {format(new Date(reminder.endDate), "d 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {/* Histórico recente */}
          {completions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Histórico recente</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {completions.slice(0, 10).map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg px-3 py-2"
                  >
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">
                      {format(new Date(completion.completed_at), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowEditForm(true)}
              className="rounded-xl"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleActive}
              className="rounded-xl"
            >
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
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="rounded-xl text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
