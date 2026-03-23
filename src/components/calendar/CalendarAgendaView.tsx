import { useState, useMemo } from 'react';
import { format, addDays, isToday as isTodayFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Sun, Sunset, Moon, PartyPopper, Filter, Calendar as CalendarIconLucide } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Icon3D } from '@/components/ui/icon-picker';
import { Progress } from '@/components/ui/progress';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';

type FilterType = 'all' | 'task' | 'habit' | 'google';

interface AgendaItem {
  id: string;
  type: 'task' | 'habit' | 'google';
  title: string;
  icon: string;
  completed: boolean;
  time?: string;
  endTime?: string;
  priority?: string;
  color?: string;
}

interface TimeSlot {
  hour: number;
  label: string;
  items: AgendaItem[];
}

export function CalendarAgendaView() {
  const { tasks, habits, getHabitCompletionForDate, completeHabit, toggleTaskComplete } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const isToday = isTodayFn(selectedDate);
  const isTomorrow = format(selectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();

  const { events: googleEvents, isConnected: isGoogleConnected } = useGoogleCalendarEvents(dateStr);

  // Build all items
  const allItems = useMemo(() => {
    const items: AgendaItem[] = [];

    // Habits
    habits
      .filter((h) => {
        if (!h.isActive) return false;
        if (h.frequency === 'daily') return true;
        if ((h.frequency === 'weekly' || h.frequency === 'specific_days') && h.daysOfWeek?.includes(dayOfWeek)) return true;
        return false;
      })
      .forEach((h) => {
        items.push({
          id: h.id,
          type: 'habit',
          title: h.title,
          icon: h.icon,
          completed: getHabitCompletionForDate(h.id, dateStr) >= h.timesPerDay,
          time: h.specificTime || undefined,
          priority: undefined,
        });
      });

    // Tasks
    tasks
      .filter((t) => t.scheduledFor === dateStr || t.dueDate === dateStr)
      .forEach((t) => {
        items.push({
          id: t.id,
          type: 'task',
          title: t.title,
          icon: t.icon || 'check',
          completed: t.status === 'completed',
          time: undefined,
          priority: t.priority,
        });
      });

    // Google Calendar events
    googleEvents.forEach((evt) => {
      items.push({
        id: evt.id,
        type: 'google',
        title: evt.title,
        icon: 'calendar',
        completed: false,
        time: evt.startTime,
        endTime: evt.endTime,
        color: evt.color,
      });
    });

    return items;
  }, [tasks, habits, dateStr, dayOfWeek, getHabitCompletionForDate, googleEvents]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter(i => i.type === activeFilter);
  }, [allItems, activeFilter]);

  // Group into time slots (hourly)
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const noTimeItems: AgendaItem[] = [];

    filteredItems.forEach(item => {
      if (item.time) {
        const hour = parseInt(item.time.split(':')[0]);
        let slot = slots.find(s => s.hour === hour);
        if (!slot) {
          slot = { hour, label: `${String(hour).padStart(2, '0')}:00`, items: [] };
          slots.push(slot);
        }
        slot.items.push(item);
      } else {
        noTimeItems.push(item);
      }
    });

    slots.sort((a, b) => a.hour - b.hour);

    // Items without time go into "Sem horário"
    if (noTimeItems.length > 0) {
      slots.push({ hour: -1, label: 'Sem horário', items: noTimeItems });
    }

    return slots;
  }, [filteredItems]);

  const handleToggleComplete = (item: AgendaItem) => {
    if (item.type === 'habit') {
      completeHabit(item.id, dateStr);
    } else if (item.type === 'task') {
      toggleTaskComplete(item.id);
    }
  };

  const goToPrevDay = () => setSelectedDate(prev => addDays(prev, -1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const totalCompletable = allItems.filter(i => i.type !== 'google').length;
  const completedCount = allItems.filter(i => i.completed).length;
  const progressPercent = totalCompletable > 0 ? Math.round((completedCount / totalCompletable) * 100) : 0;

  const getPeriodForHour = (hour: number): 'morning' | 'afternoon' | 'evening' => {
    if (hour < 0) return 'morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const getPeriodIcon = (period: 'morning' | 'afternoon' | 'evening') => {
    switch (period) {
      case 'morning': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'afternoon': return <Sunset className="w-3.5 h-3.5 text-orange-400" />;
      case 'evening': return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const getTypeColor = (type: 'task' | 'habit' | 'google') => {
    switch (type) {
      case 'habit': return 'bg-emerald-500';
      case 'task': return 'bg-blue-500';
      case 'google': return 'bg-red-500';
    }
  };

  const getTypeBorder = (type: 'task' | 'habit' | 'google') => {
    switch (type) {
      case 'habit': return 'border-l-emerald-500';
      case 'task': return 'border-l-blue-500';
      case 'google': return 'border-l-red-500';
    }
  };

  const filterCounts = useMemo(() => ({
    all: allItems.length,
    task: allItems.filter(i => i.type === 'task').length,
    habit: allItems.filter(i => i.type === 'habit').length,
    google: allItems.filter(i => i.type === 'google').length,
  }), [allItems]);

  // Generate day pills for horizontal scroll
  const dayPills = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = addDays(new Date(), i);
      days.push(d);
    }
    return days;
  }, []);

  return (
    <div className="space-y-5">
      {/* Date Navigation - Horizontal Day Pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrevDay}
          className="p-1.5 rounded-lg bg-card/50 hover:bg-card/70 border border-border/10 text-foreground transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
          {dayPills.map((d) => {
            const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isDayToday = isTodayFn(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center min-w-[48px] px-2 py-2 rounded-xl text-xs transition-all",
                  isSelected
                    ? "gradient-bg text-primary-foreground shadow-lg scale-105"
                    : isDayToday
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "bg-card/40 border border-border/10 text-muted-foreground hover:bg-card/60"
                )}
              >
                <span className="text-[10px] uppercase font-medium opacity-80">
                  {format(d, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-lg font-bold leading-tight">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={goToNextDay}
          className="p-1.5 rounded-lg bg-card/50 hover:bg-card/70 border border-border/10 text-foreground transition-all flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Date label */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isToday ? 'Hoje' : isTomorrow ? 'Amanhã' : format(selectedDate, 'd MMMM', { locale: ptBR })}
          </h2>
          <p className="text-xs text-muted-foreground capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {!isToday && (
          <button onClick={goToToday} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium">
            Ir para hoje
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {([
          { key: 'all' as FilterType, label: 'Todos', icon: null },
          { key: 'task' as FilterType, label: 'Tarefas', icon: <span className="w-2 h-2 rounded-full bg-blue-500" /> },
          { key: 'habit' as FilterType, label: 'Hábitos', icon: <span className="w-2 h-2 rounded-full bg-emerald-500" /> },
          ...(isGoogleConnected ? [{ key: 'google' as FilterType, label: 'Google', icon: <CalendarIconLucide className="w-3 h-3 text-red-500" /> }] : []),
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              activeFilter === f.key
                ? "gradient-bg text-primary-foreground shadow-sm"
                : "bg-card/50 border border-border/10 text-muted-foreground hover:bg-card/70"
            )}
          >
            {f.icon}
            {f.label}
            {filterCounts[f.key] > 0 && (
              <span className={cn(
                "text-[10px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-1",
                activeFilter === f.key ? "bg-white/20" : "bg-muted"
              )}>
                {filterCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        <AnimatePresence mode="wait">
          {timeSlots.length > 0 ? (
            <motion.div
              key={dateStr + activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Timeline line */}
              <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border/20" />

              {timeSlots.map((slot, slotIndex) => {
                const period = getPeriodForHour(slot.hour);
                const prevPeriod = slotIndex > 0 ? getPeriodForHour(timeSlots[slotIndex - 1].hour) : null;
                const showPeriodHeader = period !== prevPeriod;

                return (
                  <div key={slot.hour}>
                    {/* Period separator */}
                    {showPeriodHeader && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: slotIndex * 0.03 }}
                        className="flex items-center gap-2 py-2 pl-1"
                      >
                        {getPeriodIcon(period)}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : 'Noite'}
                        </span>
                        <div className="flex-1 h-px bg-border/10" />
                      </motion.div>
                    )}

                    {/* Time slot */}
                    <div className="flex gap-3 min-h-[44px]">
                      {/* Time label */}
                      <div className="w-[44px] flex-shrink-0 text-right pt-2">
                        <span className="text-[11px] text-muted-foreground/70 font-mono">
                          {slot.hour >= 0 ? slot.label : ''}
                        </span>
                      </div>

                      {/* Dot on timeline */}
                      <div className="relative flex-shrink-0 w-[16px] flex items-start justify-center pt-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full z-10",
                          slot.items.some(i => !i.completed) ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                      </div>

                      {/* Items */}
                      <div className="flex-1 space-y-1.5 pb-3">
                        {slot.items.map((item, itemIndex) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: slotIndex * 0.03 + itemIndex * 0.02 }}
                            className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-xl transition-all border-l-[3px]",
                              "bg-card/60 backdrop-blur-sm",
                              "hover:bg-card/80 hover:shadow-sm",
                              getTypeBorder(item.type),
                              item.completed && "opacity-50"
                            )}
                          >
                            {/* Checkbox (not for google events) */}
                            {item.type !== 'google' ? (
                              <button
                                onClick={() => handleToggleComplete(item)}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                  item.completed
                                    ? cn(getTypeColor(item.type), "border-transparent")
                                    : item.type === 'habit'
                                    ? "border-emerald-500/40 hover:border-emerald-500"
                                    : "border-blue-500/40 hover:border-blue-500"
                                )}
                              >
                                {item.completed && <Check className="w-3 h-3 text-white" />}
                              </button>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <CalendarIconLucide className="w-3 h-3 text-red-500" />
                              </div>
                            )}

                            {/* Icon */}
                            <Icon3D icon={item.icon} size="sm" />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                "text-sm block truncate",
                                item.completed ? "line-through text-muted-foreground" : "text-foreground"
                              )}>
                                {item.title}
                              </span>
                              {item.time && item.endTime && (
                                <span className="text-[10px] text-muted-foreground">
                                  {item.time} – {item.endTime}
                                </span>
                              )}
                            </div>

                            {/* Priority badge for tasks */}
                            {item.priority && item.priority !== 'medium' && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                item.priority === 'urgent' && "bg-red-500/20 text-red-400",
                                item.priority === 'high' && "bg-orange-500/20 text-orange-400",
                                item.priority === 'low' && "bg-muted text-muted-foreground",
                              )}>
                                {item.priority === 'urgent' ? 'Urgente' : item.priority === 'high' ? 'Alta' : 'Baixa'}
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/10 flex items-center justify-center">
                <PartyPopper className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum compromisso para este dia</p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Aproveite seu dia livre! 🎉
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Daily Progress */}
      {totalCompletable > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-border/10 rounded-xl p-3.5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Progresso do dia</span>
            <span className="text-sm font-bold text-foreground">
              {completedCount}/{totalCompletable}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          {progressPercent === 100 && (
            <p className="text-[10px] text-center mt-1.5 text-primary">
              🎉 Tudo concluído!
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
