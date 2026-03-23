import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, Sparkles, Flame, ChevronLeft, ChevronRight, Filter, X, CalendarIcon, LayoutGrid, List } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCategoriesData } from '@/hooks/useCategoriesData';
import { HabitCard } from '@/components/habits/HabitCard';
import { RoutineCard } from '@/components/habits/RoutineCard';
import { HabitFormModal } from '@/components/habits/HabitFormModal';
import { HabitsGridView } from '@/components/habits/HabitsGridView';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { TimeOfDay, HabitColor } from '@/types';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { Icon3D } from '@/components/ui/icon-picker';

const timeOfDayConfig: Record<TimeOfDay, { label: string; emoji: string }> = {
  morning: { label: 'Manhã', emoji: '☀️' },
  afternoon: { label: 'Tarde', emoji: '🌤️' },
  evening: { label: 'Noite', emoji: '🌙' },
  anytime: { label: 'Qualquer hora', emoji: '⏰' },
};

const colorOptions: { id: HabitColor | 'all'; label: string; class: string }[] = [
  { id: 'all', label: 'Todas', class: '' },
  { id: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { id: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { id: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { id: 'green', label: 'Verde', class: 'bg-green-500' },
  { id: 'teal', label: 'Turquesa', class: 'bg-teal-500' },
  { id: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { id: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { id: 'pink', label: 'Rosa', class: 'bg-pink-500' },
];

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening' | 'anytime';
type StatusFilter = 'all' | 'completed' | 'pending';
type FrequencyFilter = 'all' | 'daily' | 'weekly' | 'specific_days';
type ColorFilter = HabitColor | 'all';
type ViewMode = 'cards' | 'grid';

export function HabitsView() {
  const { habits, routines, getHabitCompletionForDate, deleteHabit, deleteRoutine } = useStore();
  const { categories } = useCategoriesData('habit');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const getDateQuickLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM');
  };

  // Filter active habits scheduled for selected date
  const dateHabits = habits.filter((h) => {
    if (!h.isActive) return false;
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly' && h.daysOfWeek?.includes(dayOfWeek)) return true;
    if (h.frequency === 'specific_days' && h.daysOfWeek?.includes(dayOfWeek)) return true;
    return false;
  });

  // Apply filters
  const filteredHabits = dateHabits.filter((h) => {
    // Time filter
    if (timeFilter !== 'all' && h.timeOfDay !== timeFilter) return false;
    
    // Status filter
    const completion = getHabitCompletionForDate(h.id, selectedDateStr);
    const isCompleted = completion >= h.timesPerDay;
    if (statusFilter === 'completed' && !isCompleted) return false;
    if (statusFilter === 'pending' && isCompleted) return false;
    
    // Frequency filter
    if (frequencyFilter !== 'all' && h.frequency !== frequencyFilter) return false;
    
    // Color filter
    if (colorFilter !== 'all' && h.color !== colorFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && h.categoryId !== categoryFilter) return false;
    
    return true;
  });

  // Total habits count for display
  const totalHabitsCount = dateHabits.length;

  // Stats for filtered date
  const completedToday = filteredHabits.filter(
    (h) => getHabitCompletionForDate(h.id, selectedDateStr) >= h.timesPerDay
  ).length;

  // Group habits by time of day (excluding those in routines)
  const habitsByTime = (timeOfDay: TimeOfDay) =>
    filteredHabits.filter((h) => h.timeOfDay === timeOfDay && !h.routineId);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  
  const hasActiveFilters = timeFilter !== 'all' || statusFilter !== 'all' || frequencyFilter !== 'all' || colorFilter !== 'all' || categoryFilter !== 'all';
  const activeFiltersCount = [timeFilter !== 'all', statusFilter !== 'all', frequencyFilter !== 'all', colorFilter !== 'all', categoryFilter !== 'all'].filter(Boolean).length;
  
  const clearAllFilters = () => {
    setTimeFilter('all');
    setStatusFilter('all');
    setFrequencyFilter('all');
    setColorFilter('all');
    setCategoryFilter('all');
  };
  
  // Get category name by id
  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category?.name || 'Categoria';
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-4 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky sticky-safe-top z-40 py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Hábitos</h2>
            <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
              <Button
                size="sm"
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('cards')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Button - only show for cards view */}
            {viewMode === 'cards' && (
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "gap-1 h-8 w-8 p-0 relative",
                      hasActiveFilters && "border-primary text-primary"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4 max-h-[80vh] overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Filtros</h4>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground hover:text-foreground"
                          onClick={clearAllFilters}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>

                    {/* Time of Day Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Horário</Label>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          { id: 'all' as TimeFilter, label: 'Todos' },
                          { id: 'morning' as TimeFilter, label: '☀️ Manhã' },
                          { id: 'afternoon' as TimeFilter, label: '🌤️ Tarde' },
                          { id: 'evening' as TimeFilter, label: '🌙 Noite' },
                          { id: 'anytime' as TimeFilter, label: '⏰ Qualquer' },
                        ]).map((t) => (
                          <Button
                            key={t.id}
                            variant={timeFilter === t.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setTimeFilter(t.id)}
                          >
                            {t.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          { id: 'all' as StatusFilter, label: 'Todos' },
                          { id: 'completed' as StatusFilter, label: '✅ Concluídos' },
                          { id: 'pending' as StatusFilter, label: '⏳ Pendentes' },
                        ]).map((s) => (
                          <Button
                            key={s.id}
                            variant={statusFilter === s.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setStatusFilter(s.id)}
                          >
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Frequency Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Frequência</Label>
                      <div className="flex gap-1 flex-wrap">
                        {([
                          { id: 'all' as FrequencyFilter, label: 'Todas' },
                          { id: 'daily' as FrequencyFilter, label: 'Diário' },
                          { id: 'weekly' as FrequencyFilter, label: 'Semanal' },
                          { id: 'specific_days' as FrequencyFilter, label: 'Dias específicos' },
                        ]).map((f) => (
                          <Button
                            key={f.id}
                            variant={frequencyFilter === f.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setFrequencyFilter(f.id)}
                          >
                            {f.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Color Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Cor</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {colorOptions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setColorFilter(c.id)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              c.id === 'all' 
                                ? "bg-gradient-to-br from-red-500 via-green-500 to-blue-500" 
                                : c.class,
                              colorFilter === c.id 
                                ? "border-foreground scale-110 ring-2 ring-primary/30" 
                                : "border-transparent hover:border-muted-foreground/50"
                            )}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    {categories.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todas as categorias" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-2">
                                  <Icon3D icon={cat.icon} size="xs" />
                                  <span>{cat.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date Navigation - only show for cards view */}
        {viewMode === 'cards' && (
          <div className="flex items-center justify-between mt-3 gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-3"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {getDateQuickLabel(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(date);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick date buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant={isToday(selectedDate) ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant={isTomorrow(selectedDate) ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setSelectedDate(addDays(new Date(), 1))}
              >
                Amanhã
              </Button>
            </div>
          </div>
        )}

        {/* Active Filters Display - only show for cards view */}
        {viewMode === 'cards' && hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-xs text-muted-foreground mr-1">
              Mostrando {filteredHabits.length} de {totalHabitsCount} hábitos
            </span>
            {timeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                {timeOfDayConfig[timeFilter].emoji} {timeOfDayConfig[timeFilter].label}
                <button
                  onClick={() => setTimeFilter('all')}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                {statusFilter === 'completed' ? '✅ Concluídos' : '⏳ Pendentes'}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {frequencyFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                {frequencyFilter === 'daily' ? 'Diário' : frequencyFilter === 'weekly' ? 'Semanal' : 'Dias específicos'}
                <button
                  onClick={() => setFrequencyFilter('all')}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {colorFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                <span className={cn("w-3 h-3 rounded-full", colorOptions.find(c => c.id === colorFilter)?.class)} />
                {colorOptions.find(c => c.id === colorFilter)?.label}
                <button
                  onClick={() => setColorFilter('all')}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs h-6">
                {categories.find(c => c.id === categoryFilter)?.icon} {getCategoryName(categoryFilter)}
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={clearAllFilters}
            >
              Limpar todos
            </Button>
          </div>
        )}
      </motion.header>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="mt-4">
          <HabitsGridView habits={habits.filter(h => h.isActive)} />
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6 mt-4"
        >
        {/* Today's Analysis Card */}
        <motion.div variants={item} className="rounded-2xl bg-card/50 backdrop-blur-md border border-border/30 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Análise do Dia</h3>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progresso</span>
              <span className="text-sm font-semibold text-foreground">
                {completedToday}/{filteredHabits.length} hábitos
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: filteredHabits.length > 0 ? `${(completedToday / filteredHabits.length) * 100}%` : '0%' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full gradient-bg"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/30 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">{completedToday}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">{filteredHabits.length - completedToday}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30 backdrop-blur-sm">
              <p className="text-2xl font-bold text-primary">
                {filteredHabits.length > 0 ? Math.round((completedToday / filteredHabits.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Taxa</p>
            </div>
          </div>

          {/* Motivational Message */}
          {filteredHabits.length > 0 && isToday(selectedDate) && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                {completedToday === 0 && "Comece seu dia completando o primeiro hábito! 💪"}
                {completedToday > 0 && completedToday < filteredHabits.length && `Ótimo progresso! Faltam ${filteredHabits.length - completedToday} para completar o dia 🔥`}
                {completedToday === filteredHabits.length && filteredHabits.length > 0 && "Parabéns! Você completou todos os hábitos de hoje! 🎉"}
              </p>
            </div>
          )}
        </motion.div>

        {/* Routines Section */}
        {routines.filter((r) => r.isActive).length > 0 && (
          <motion.section variants={item}>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              Rotinas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
              {routines
                .filter((r) => r.isActive)
                .map((routine) => (
                  <SwipeableItem
                    key={routine.id}
                    onDelete={() => {
                      deleteRoutine(routine.id);
                      toast({ title: 'Rotina excluída' });
                    }}
                  >
                    <RoutineCard routine={routine} />
                  </SwipeableItem>
                ))}
            </div>
          </motion.section>
        )}

        {/* Habits by Time of Day */}
        {(['morning', 'afternoon', 'evening', 'anytime'] as TimeOfDay[]).map((timeOfDay) => {
          const habitsForTime = habitsByTime(timeOfDay);
          if (habitsForTime.length === 0) return null;

          const config = timeOfDayConfig[timeOfDay];

          return (
            <motion.section key={timeOfDay} variants={item}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                <span>{config.emoji}</span>
                {config.label}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                {habitsForTime.map((habit) => (
                  <SwipeableItem
                    key={habit.id}
                    onDelete={() => {
                      deleteHabit(habit.id);
                      toast({ title: 'Hábito excluído' });
                    }}
                  >
                    <HabitCard habit={habit} selectedDate={selectedDateStr} />
                  </SwipeableItem>
                ))}
              </div>
            </motion.section>
          );
        })}

        {/* Empty State */}
        {habits.length === 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mb-4">
              <Flame className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Construa sua rotina ideal
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Comece com um hábito simples. Pequenas ações diárias levam a grandes resultados.
            </p>
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground font-medium transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro hábito
            </button>
          </motion.div>
        )}

        {/* No results with filters */}
        {habits.length > 0 && filteredHabits.length === 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum hábito encontrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Tente ajustar os filtros ou selecionar outra data.
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Limpar filtros
            </Button>
          </motion.div>
        )}

        </motion.div>
      )}

      <HabitFormModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
