import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Eye, Circle, Plus } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon3D } from '@/components/ui/icon-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HabitDetailView } from '@/components/habits/HabitDetailView';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DraggableTaskItem } from './DraggableTaskItem';
import { DroppableDay } from './DroppableDay';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface DayItem {
  id: string;
  title: string;
  icon: string;
  type: 'habit' | 'task' | 'milestone';
  completed: boolean;
  status?: string;
  priority?: string;
  goalId?: string;
  goalTitle?: string;
}

const MAX_VISIBLE_ITEMS = 3;

export function CalendarWeeklyView() {
  const { habits, tasks, goals, getHabitCompletionForDate, completeHabit, toggleTaskComplete, updateTask } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; title: string } | null>(null);
  const isMobile = useIsMobile();
  
  // Detail modal states
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Create task modal state
  const [showCreateTask, setShowCreateTask] = useState(false);

  // DnD Sensors - with touch support but disabled on mobile for better scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Week starts on Sunday (0) - can be changed to Monday (1) if needed
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const weekLabel = `${format(weekStart, "d", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`;

  const getDateStr = (date: Date) => format(date, 'yyyy-MM-dd');

  const getDayItems = (date: Date): DayItem[] => {
    const dateStr = getDateStr(date);
    const dayOfWeek = date.getDay();
    const items: DayItem[] = [];

    // Get habits for this day
    habits
      .filter((h) => {
        if (!h.isActive) return false;
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
        return false;
      })
      .forEach((h) => {
        items.push({
          id: h.id,
          title: h.title,
          icon: h.icon,
          type: 'habit',
          completed: getHabitCompletionForDate(h.id, dateStr) >= h.timesPerDay,
        });
      });

    // Get tasks for this day
    tasks
      .filter((t) => t.scheduledFor === dateStr || t.dueDate === dateStr)
      .forEach((t) => {
        items.push({
          id: t.id,
          title: t.title,
          icon: t.icon || 'check',
          type: 'task',
          completed: t.status === 'completed',
          status: t.status,
          priority: t.priority,
        });
      });

    // Get milestones for this day
    goals.forEach((goal) => {
      goal.milestones.forEach((m) => {
        if (m.targetDate === dateStr) {
          items.push({
            id: m.id,
            title: m.title,
            icon: goal.icon,
            type: 'milestone',
            completed: m.isCompleted,
            goalId: goal.id,
            goalTitle: goal.title,
          });
        }
      });
    });

    return items;
  };

  const weekData = useMemo(() => {
    return weekDays.map((day) => ({
      date: day,
      dateStr: getDateStr(day),
      items: getDayItems(day),
    }));
  }, [weekDays, habits, tasks, goals, getHabitCompletionForDate]);

  const handleItemClick = (item: DayItem) => {
    if (item.type === 'habit') {
      setSelectedHabitId(item.id);
    } else if (item.type === 'task') {
      setSelectedTaskId(item.id);
    } else if (item.type === 'milestone' && item.goalId) {
      setSelectedGoalId(item.goalId);
    }
  };

  const handleCompleteItem = (item: DayItem, dateStr: string) => {
    if (item.type === 'habit') {
      completeHabit(item.id, dateStr);
    } else if (item.type === 'task') {
      toggleTaskComplete(item.id);
    }
  };

  const getItemColor = (type: DayItem['type']) => {
    switch (type) {
      case 'habit': return 'emerald';
      case 'task': return 'blue';
      case 'milestone': return 'purple';
      default: return 'gray';
    }
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'task') {
      setDraggedItem({
        id: active.data.current.taskId,
        title: active.data.current.title,
      });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || !active.data.current) return;

    const taskId = active.data.current.taskId;
    const targetDateStr = over.data.current?.dateStr;

    if (!taskId || !targetDateStr) return;

    // Find the task's current date
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentDateStr = task.scheduledFor || task.dueDate;
    
    // Don't do anything if dropped on same day
    if (currentDateStr === targetDateStr) return;

    // Update task date
    updateTask(taskId, {
      scheduledFor: targetDateStr,
      dueDate: task.dueDate === currentDateStr ? targetDateStr : task.dueDate,
    });

    // Format the new date for display
    const newDate = new Date(targetDateStr);
    const formattedDate = format(newDate, "d 'de' MMMM", { locale: ptBR });

    toast({
      title: "Tarefa reagendada",
      description: `"${task.title}" movida para ${formattedDate}`,
    });
  }, [tasks, updateTask]);

  const expandedDayData = expandedDay ? getDayItems(expandedDay) : [];

  const renderDayContent = (date: Date, items: DayItem[], dateStr: string) => {
    const today = isToday(date);
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <>
        {/* Day Header */}
        <div className={cn(
          "text-center pb-2 border-b border-border/10 mb-2",
          today && "text-primary"
        )}>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {format(date, 'EEE', { locale: ptBR })}
          </p>
          <p className={cn(
            "text-lg font-bold",
            today ? "text-primary" : "text-foreground"
          )}>
            {format(date, 'd')}
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {visibleItems.map((item) => (
            <DraggableTaskItem
              key={`${item.type}-${item.id}`}
              id={item.id}
              title={item.title}
              completed={item.completed}
              type={item.type}
              onClick={() => handleItemClick(item)}
              disabled={isMobile}
            />
          ))}

          {hiddenCount > 0 && (
            <button
              onClick={() => setExpandedDay(date)}
              className="w-full text-xs text-primary hover:underline py-1 text-center"
            >
              +{hiddenCount} mais
            </button>
          )}

          {items.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <Circle className="w-6 h-6 text-muted-foreground/20" />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevWeek}
            className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/10 text-foreground hover:bg-card/70 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex flex-col items-center">
            <h3 className="text-base font-semibold text-foreground">{weekLabel}</h3>
            <button
              onClick={goToToday}
              className="text-xs text-primary hover:underline mt-1"
            >
              Ir para hoje
            </button>
          </div>
          
          <button
            onClick={nextWeek}
            className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/10 text-foreground hover:bg-card/70 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Week Grid - Desktop */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {weekData.map(({ date, dateStr, items }, index) => {
            const today = isToday(date);

            return (
              <DroppableDay
                key={date.toISOString()}
                id={`day-${dateStr}`}
                dateStr={dateStr}
                isToday={today}
                className={cn(
                  "min-h-[180px] rounded-xl p-2 transition-all flex flex-col",
                  "bg-card/40 backdrop-blur-sm border",
                  today 
                    ? "border-primary ring-2 ring-primary/30 shadow-[0_0_16px_hsl(var(--primary)/0.3)]" 
                    : "border-border/10 hover:border-border/30"
                )}
              >
                {renderDayContent(date, items, dateStr)}
              </DroppableDay>
            );
          })}
        </div>

        {/* Week Grid - Mobile (Horizontal Scroll - No DnD) */}
        <ScrollArea className="md:hidden w-full">
          <div className="flex gap-3 pb-4">
            {weekData.map(({ date, dateStr, items }, index) => {
              const today = isToday(date);
              const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
              const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

              return (
                <motion.div
                  key={date.toISOString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "min-w-[140px] min-h-[200px] rounded-xl p-2 transition-all flex flex-col flex-shrink-0",
                    "bg-card/40 backdrop-blur-sm border",
                    today 
                      ? "border-primary ring-2 ring-primary/30 shadow-[0_0_16px_hsl(var(--primary)/0.3)]" 
                      : "border-border/10"
                  )}
                >
                  {/* Day Header */}
                  <div className={cn(
                    "text-center pb-2 border-b border-border/10 mb-2",
                    today && "text-primary"
                  )}>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {format(date, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={cn(
                      "text-lg font-bold",
                      today ? "text-primary" : "text-foreground"
                    )}>
                      {format(date, 'd')}
                    </p>
                  </div>

                  {/* Items - Simplified for mobile (no drag) */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {visibleItems.map((item) => {
                      const color = getItemColor(item.type);
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            "flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer transition-all text-xs",
                            item.completed ? "opacity-50" : ""
                          )}
                          style={{
                            backgroundColor: item.completed 
                              ? 'hsl(var(--muted)/0.3)' 
                              : `${color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' : color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)'}`,
                            borderLeft: `2px solid ${color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7'}`
                          }}
                        >
                          <div 
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: item.completed 
                                ? (color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7')
                                : 'transparent',
                              border: !item.completed 
                                ? `1px solid ${color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7'}`
                                : 'none'
                            }}
                          >
                            {item.completed && <Check className="w-2 h-2 text-white" />}
                          </div>
                          <span className={cn(
                            "truncate flex-1",
                            item.completed && "line-through text-muted-foreground"
                          )}>
                            {item.title}
                          </span>
                        </div>
                      );
                    })}

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => setExpandedDay(date)}
                        className="w-full text-xs text-primary hover:underline py-1 text-center"
                      >
                        +{hiddenCount} mais
                      </button>
                    )}

                    {items.length === 0 && (
                      <div className="flex items-center justify-center h-full">
                        <Circle className="w-6 h-6 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Hábitos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Tarefas (arraste para reagendar)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-muted-foreground">Marcos</span>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem && (
            <div className="px-3 py-2 rounded-lg bg-primary text-primary-foreground shadow-lg text-sm font-medium">
              {draggedItem.title}
            </div>
          )}
        </DragOverlay>

        {/* Expanded Day Modal */}
        <Dialog open={expandedDay !== null && !showCreateTask} onOpenChange={() => setExpandedDay(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold capitalize">
                {expandedDay && format(expandedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </DialogTitle>
            </DialogHeader>
            
            {expandedDay && (
              <div className="space-y-4 mt-4">
                {/* Quick Add Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTask(true)}
                  className="w-full bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-500"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nova Tarefa
                </Button>

                {/* Group by type */}
                {['habit', 'task', 'milestone'].map((type) => {
                  const typeItems = expandedDayData.filter(item => item.type === type);
                  if (type !== 'task' && typeItems.length === 0) return null;
                  
                  const color = getItemColor(type as DayItem['type']);
                  const label = type === 'habit' ? 'Hábitos' : type === 'task' ? 'Tarefas' : 'Marcos';
                  const completedCount = typeItems.filter(i => i.completed).length;

                  return (
                    <div key={type}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7' }}
                        />
                        {label} {typeItems.length > 0 && `(${completedCount}/${typeItems.length})`}
                        {type === 'habit' && <span className="text-[10px] ml-1">🔒</span>}
                      </h3>

                      {typeItems.length > 0 ? (
                        <div className="space-y-2">
                          {typeItems.map((item) => (
                            <div
                              key={`${item.type}-${item.id}`}
                              onClick={() => handleItemClick(item)}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
                                'bg-card/50 border border-transparent hover:border-border/50 hover:bg-card/70',
                                item.completed && 'opacity-60'
                              )}
                            >
                              {item.type !== 'milestone' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteItem(item, getDateStr(expandedDay));
                                  }}
                                  className={cn(
                                    'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                                    item.completed 
                                      ? `border-transparent` 
                                      : 'hover:border-opacity-100'
                                  )}
                                  style={{
                                    backgroundColor: item.completed 
                                      ? (color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7')
                                      : 'transparent',
                                    borderColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#a855f7'
                                  }}
                                >
                                  {item.completed && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                              )}
                              {item.type === 'milestone' && (
                                <div 
                                  className={cn(
                                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                                    item.completed ? 'border-transparent' : ''
                                  )}
                                  style={{
                                    backgroundColor: item.completed ? '#a855f7' : 'transparent',
                                    borderColor: '#a855f7'
                                  }}
                                >
                                  {item.completed && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                              )}
                              <Icon3D icon={item.icon} size="lg" />
                              <div className="flex-1 min-w-0">
                                <span className={cn(
                                  'text-sm block truncate',
                                  item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                                )}>
                                  {item.title}
                                </span>
                                {item.type === 'milestone' && item.goalTitle && (
                                  <span className="text-xs text-muted-foreground">{item.goalTitle}</span>
                                )}
                              </div>
                              <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : type === 'task' ? (
                        <button
                          onClick={() => setShowCreateTask(true)}
                          className="w-full p-3 rounded-xl border-2 border-dashed border-border/30 hover:border-blue-500/50 
                                   text-muted-foreground hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">Adicionar tarefa</span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}

                {/* Empty State */}
                {expandedDayData.length === 0 && (
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
                      Criar tarefa
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Task Modal */}
        {expandedDay && (
          <CreateTaskForm 
            open={showCreateTask} 
            onOpenChange={(open) => {
              setShowCreateTask(open);
              if (!open && expandedDay) {
                // Keep the expanded day modal open
              }
            }}
            defaultStartDate={getDateStr(expandedDay)}
          />
        )}

        {/* Detail Views */}
        {selectedHabitId && habits.find(h => h.id === selectedHabitId) && (
          <HabitDetailView 
            habit={habits.find(h => h.id === selectedHabitId)!}
            open={!!selectedHabitId}
            onOpenChange={(open) => !open && setSelectedHabitId(null)}
            onEdit={() => {}}
          />
        )}

        {selectedTaskId && (
          <TaskDetailView
            task={tasks.find(t => t.id === selectedTaskId) || null}
            open={!!selectedTaskId}
            onOpenChange={(open) => !open && setSelectedTaskId(null)}
          />
        )}

        {selectedGoalId && (
          <GoalDetailsModal
            goalId={selectedGoalId}
            open={!!selectedGoalId}
            onOpenChange={(open) => !open && setSelectedGoalId(null)}
          />
        )}
      </div>
    </DndContext>
  );
}
