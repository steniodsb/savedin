import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Grid3X3, ListTodo, Check, Circle, Eye, CalendarDays, Plus, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon3D } from '@/components/ui/icon-picker';
import { HabitDetailView } from '@/components/habits/HabitDetailView';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { Button } from '@/components/ui/button';


// Import sub-views
import { CalendarAgendaView } from '@/components/calendar/CalendarAgendaView';
import { CalendarMonthlyView } from '@/components/calendar/CalendarMonthlyView';
import { CalendarWeeklyView } from '@/components/calendar/CalendarWeeklyView';
import { CalendarHeatmapView } from '@/components/calendar/CalendarHeatmapView';

type ViewType = 'agenda' | 'weekly' | 'monthly' | 'heatmap';

interface DayData {
  habits: { id: string; title: string; icon: string; completed: boolean }[];
  tasks: { id: string; title: string; icon: string; status: string; priority: string }[];
  milestones: { id: string; title: string; goalId: string; goalTitle: string; completed: boolean }[];
}

export function CalendarView() {
  const { habits, tasks, goals, getHabitCompletionForDate, completeHabit, toggleTaskComplete } = useStore();
  const [viewType, setViewType] = useState<ViewType>('agenda');
  
  // Day detail modal state
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: number; month: number; year: number } | null>(null);
  
  // Detail modal states
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Create task modal state
  const [showCreateTask, setShowCreateTask] = useState(false);

  const todayDate = new Date();
  const todayStr = format(todayDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  const handleDaySelect = (day: number, month: number, year: number) => {
    setSelectedDayInfo({ day, month, year });
  };

  const getDateStr = (day: number, month: number, year: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getDayData = (day: number, month: number, year: number): DayData => {
    const dateStr = getDateStr(day, month, year);
    const dayOfWeek = new Date(year, month, day).getDay();

    // Get habits for this day
    const dayHabits = habits
      .filter((h) => {
        if (!h.isActive) return false;
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        return false;
      })
      .map((h) => ({
        id: h.id,
        title: h.title,
        icon: h.icon,
        completed: getHabitCompletionForDate(h.id, dateStr) >= h.timesPerDay,
      }));

    // Get tasks for this day
    const dayTasks = tasks
      .filter((t) => t.scheduledFor === dateStr || t.dueDate === dateStr)
      .map((t) => ({
        id: t.id,
        title: t.title,
        icon: t.icon || 'check',
        status: t.status,
        priority: t.priority,
      }));

    // Get milestones for this day
    const dayMilestones: { id: string; title: string; goalId: string; goalTitle: string; completed: boolean }[] = [];
    goals.forEach((goal) => {
      goal.milestones.forEach((m) => {
        if (m.targetDate === dateStr) {
          dayMilestones.push({
            id: m.id,
            title: m.title,
            goalId: goal.id,
            goalTitle: goal.title,
            completed: m.isCompleted,
          });
        }
      });
    });

    return { habits: dayHabits, tasks: dayTasks, milestones: dayMilestones };
  };

  const formatSelectedDate = (day: number, month: number, year: number) => {
    const date = new Date(year, month, day);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    return `${formatted}, ${weekday}`;
  };

  const selectedDayData = selectedDayInfo 
    ? getDayData(selectedDayInfo.day, selectedDayInfo.month, selectedDayInfo.year) 
    : null;

  const handleCompleteHabit = (habitId: string) => {
    if (selectedDayInfo) {
      const dateStr = getDateStr(selectedDayInfo.day, selectedDayInfo.month, selectedDayInfo.year);
      completeHabit(habitId, dateStr);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    toggleTaskComplete(taskId);
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-4 relative overflow-x-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-glow pointer-events-none" />
      
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        {/* Title Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Calendário</h2>
            <p className="text-sm text-muted-foreground capitalize">{todayStr}</p>
          </div>
        </div>

        {/* View Toggle - 4 Tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewType('agenda')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-all",
              viewType === 'agenda'
                ? 'gradient-bg text-primary-foreground shadow-lg'
                : 'bg-card/50 backdrop-blur-sm border border-border/10 text-muted-foreground hover:bg-card/70'
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hoje</span>
          </button>
          <button
            onClick={() => setViewType('weekly')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-all",
              viewType === 'weekly'
                ? 'gradient-bg text-primary-foreground shadow-lg'
                : 'bg-card/50 backdrop-blur-sm border border-border/10 text-muted-foreground hover:bg-card/70'
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Semana</span>
          </button>
          <button
            onClick={() => setViewType('monthly')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-all",
              viewType === 'monthly'
                ? 'gradient-bg text-primary-foreground shadow-lg'
                : 'bg-card/50 backdrop-blur-sm border border-border/10 text-muted-foreground hover:bg-card/70'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mês</span>
          </button>
          <button
            onClick={() => setViewType('heatmap')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-all",
              viewType === 'heatmap'
                ? 'gradient-bg text-primary-foreground shadow-lg'
                : 'bg-card/50 backdrop-blur-sm border border-border/10 text-muted-foreground hover:bg-card/70'
            )}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="relative mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewType === 'agenda' && <CalendarAgendaView />}
            {viewType === 'weekly' && <CalendarWeeklyView />}
            {viewType === 'monthly' && <CalendarMonthlyView onDaySelect={handleDaySelect} />}
            {viewType === 'heatmap' && <CalendarHeatmapView onDaySelect={handleDaySelect} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Day Detail Modal */}
      <Dialog open={selectedDayInfo !== null && !showCreateTask} onOpenChange={() => setSelectedDayInfo(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold capitalize">
              {selectedDayInfo && formatSelectedDate(selectedDayInfo.day, selectedDayInfo.month, selectedDayInfo.year)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDayData && (
            <div className="space-y-6 mt-4">
              {/* Quick Add Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTask(true)}
                  className="flex-1 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-500"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nova Tarefa
                </Button>
              </div>

              {/* Habits Section */}
              {selectedDayData.habits.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    Hábitos ({selectedDayData.habits.filter((h) => h.completed).length}/{selectedDayData.habits.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedDayData.habits.map((habit) => (
                      <div
                        key={habit.id}
                        onClick={() => setSelectedHabitId(habit.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
                          'bg-card/50 border border-transparent hover:border-border/50 hover:bg-card/70',
                          habit.completed && 'opacity-60'
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteHabit(habit.id);
                          }}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                            habit.completed 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-emerald-500/50 hover:border-emerald-500'
                          )}
                        >
                          {habit.completed && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <Icon3D icon={habit.icon} size="lg" />
                        <span className={cn(
                          'text-sm flex-1',
                          habit.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}>
                          {habit.title}
                        </span>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  Tarefas ({selectedDayData.tasks.filter((t) => t.status === 'completed').length}/{selectedDayData.tasks.length})
                </h3>
                {selectedDayData.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayData.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
                          'bg-card/50 border border-transparent hover:border-border/50 hover:bg-card/70',
                          task.status === 'completed' && 'opacity-60'
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteTask(task.id);
                          }}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                            task.status === 'completed' 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-blue-500/50 hover:border-blue-500'
                          )}
                        >
                          {task.status === 'completed' && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <Icon3D icon={task.icon} size="lg" />
                        <span className={cn(
                          'text-sm flex-1',
                          task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}>
                          {task.title}
                        </span>
                        {task.status === 'blocked' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-status-blocked/20 text-status-blocked">
                            Bloqueado
                          </span>
                        )}
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="w-full p-3 rounded-xl border-2 border-dashed border-border/30 hover:border-blue-500/50 
                             text-muted-foreground hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Adicionar tarefa</span>
                  </button>
                )}
              </div>

              {/* Milestones Section */}
              {selectedDayData.milestones.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" />
                    Marcos de Metas
                  </h3>
                  <div className="space-y-2">
                    {selectedDayData.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        onClick={() => setSelectedGoalId(milestone.goalId)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl cursor-pointer',
                          'bg-card/50 border border-transparent hover:border-border/50 hover:bg-card/70',
                          milestone.completed && 'opacity-60'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                          milestone.completed 
                            ? 'bg-purple-500 border-purple-500' 
                            : 'border-purple-500/50'
                        )}>
                          {milestone.completed && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            'text-sm',
                            milestone.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          )}>
                            {milestone.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{milestone.goalTitle}</p>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State - only show if absolutely nothing */}
              {selectedDayData.habits.length === 0 && 
               selectedDayData.tasks.length === 0 && 
               selectedDayData.milestones.length === 0 && (
                <div className="text-center py-4">
                  <Circle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhum item para este dia</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateTask(true)}
                    className="bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Criar primeira tarefa
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Modal - use CreateTaskForm which manages its own dialog */}
      <CreateTaskForm
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSuccess={() => {
          setShowCreateTask(false);
        }}
        defaultStartDate={selectedDayInfo ? getDateStr(selectedDayInfo.day, selectedDayInfo.month, selectedDayInfo.year) : undefined}
      />

      {/* Detail Modals */}
      {selectedHabitId && (() => {
        const habit = habits.find(h => h.id === selectedHabitId);
        if (!habit) return null;
        return (
          <HabitDetailView
            habit={habit}
            open={!!selectedHabitId}
            onOpenChange={(open) => !open && setSelectedHabitId(null)}
            onEdit={() => {}}
            selectedDate={selectedDayInfo ? getDateStr(selectedDayInfo.day, selectedDayInfo.month, selectedDayInfo.year) : undefined}
          />
        );
      })()}

      {selectedTaskId && (() => {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (!task) return null;
        return (
          <TaskDetailView
            task={task}
            open={!!selectedTaskId}
            onOpenChange={(open) => !open && setSelectedTaskId(null)}
          />
        );
      })()}

      <GoalDetailsModal
        goalId={selectedGoalId}
        open={!!selectedGoalId}
        onOpenChange={(open) => !open && setSelectedGoalId(null)}
      />
    </div>
  );
}
