import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutList, Columns, Calendar as CalendarIcon, Clock, Layers, Sparkles, ListTodo, SlidersHorizontal, ChevronLeft, ChevronRight, X, Filter, Target } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useCategoriesData } from '@/hooks/useCategoriesData';
import { Task, ViewMode } from '@/types';
import { HierarchyTaskCard } from '@/components/tasks/HierarchyTaskCard';
import { HierarchyBreadcrumb } from '@/components/tasks/HierarchyBreadcrumb';
import { SimpleTaskCard } from '@/components/tasks/SimpleTaskCard';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskTimelineView } from '@/components/tasks/TaskTimelineView';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import { Icon3D } from '@/components/ui/icon-picker';

// Color options for tasks (matching habit colors)
const colorOptions: { id: string; label: string; class: string }[] = [
  { id: 'all', label: 'Todas', class: '' },
  { id: '#EF4444', label: 'Vermelho', class: 'bg-red-500' },
  { id: '#F97316', label: 'Laranja', class: 'bg-orange-500' },
  { id: '#EAB308', label: 'Amarelo', class: 'bg-yellow-500' },
  { id: '#22C55E', label: 'Verde', class: 'bg-green-500' },
  { id: '#14B8A6', label: 'Turquesa', class: 'bg-teal-500' },
  { id: '#3B82F6', label: 'Azul', class: 'bg-blue-500' },
  { id: '#8B5CF6', label: 'Roxo', class: 'bg-purple-500' },
  { id: '#EC4899', label: 'Rosa', class: 'bg-pink-500' },
];

const viewModeConfig: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'list', label: 'Lista', icon: LayoutList },
  { id: 'hierarchy', label: 'Hierarquia', icon: Layers },
  { id: 'kanban', label: 'Kanban', icon: Columns },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

type TaskFilter = 'all' | 'pending' | 'completed' | 'today' | 'overdue';
type TaskSort = 'priority' | 'date' | 'status' | 'created';
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'blocked' | 'completed';
type DateFilterOption = 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'no_date' | 'overdue' | 'custom';

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusOrder = { blocked: 0, pending: 1, in_progress: 2, completed: 3 };

const dateFilterOptions: { id: DateFilterOption; label: string }[] = [
  { id: 'all', label: 'Todas as datas' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'no_date', label: 'Sem data' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'custom', label: 'Personalizado' },
];

export function TasksView() {
  const {
    tasks, 
    viewMode, 
    setViewMode,
    currentParentId,
    setCurrentParentId,
    breadcrumbPath,
    setBreadcrumbPath,
    pendingTaskToEdit,
    setPendingTaskToEdit,
    deleteTask,
    goals,
  } = useStore();
  
  // Get project-type goals to use as "projects"
  const projects = goals.filter(g => g.goalType === 'project');
  
  // Get categories for tasks
  const { categories } = useCategoriesData('task');
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('priority');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilterOption, setDateFilterOption] = useState<DateFilterOption>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');

  // Handle pending task to open from deep link
  useEffect(() => {
    if (pendingTaskToEdit) {
      const task = tasks.find(t => t.id === pendingTaskToEdit);
      if (task) {
        setEditingTask(task);
        setTaskModalOpen(true);
      }
      setPendingTaskToEdit(null);
    }
  }, [pendingTaskToEdit, tasks, setPendingTaskToEdit]);

  // Redirect from removed calendar view mode to list
  useEffect(() => {
    if ((viewMode as string) === 'calendar') {
      setViewMode('list');
    }
  }, [viewMode, setViewMode]);

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleNavigateInto = (taskId: string) => {
    setCurrentParentId(taskId);
    setBreadcrumbPath([...breadcrumbPath, taskId]);
  };

  // Today's date
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Format date for display
  const formatDateLabel = (date: Date) => {
    const weekDay = format(date, "EEEE", { locale: ptBR });
    const dayMonth = format(date, "d 'de' MMMM", { locale: ptBR });
    const capitalizedWeekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
    return `${capitalizedWeekDay}, ${dayMonth}`;
  };

  const getDateQuickLabel = (option: DateFilterOption, date: Date | undefined) => {
    switch (option) {
      case 'today': return 'Hoje';
      case 'tomorrow': return 'Amanhã';
      case 'this_week': return 'Esta semana';
      case 'this_month': return 'Este mês';
      case 'no_date': return 'Sem data';
      case 'overdue': return 'Atrasadas';
      case 'custom': return date ? format(date, "dd/MM", { locale: ptBR }) : 'Personalizado';
      default: return 'Todas as datas';
    }
  };

  const handleDateFilterChange = (option: DateFilterOption) => {
    setDateFilterOption(option);
    if (option === 'today') {
      setSelectedDate(new Date());
    } else if (option === 'tomorrow') {
      setSelectedDate(addDays(new Date(), 1));
    } else if (option !== 'custom') {
      setSelectedDate(undefined);
    }
    if (option === 'custom') {
      setDatePickerOpen(true);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (dateFilterOption === 'custom' || dateFilterOption === 'today' || dateFilterOption === 'tomorrow') {
      setSelectedDate(prev => {
        const current = prev || new Date();
        return direction === 'next' ? addDays(current, 1) : subDays(current, 1);
      });
      setDateFilterOption('custom');
    }
  };

  // All non-archived tasks for list view
  const allTasks = useMemo(() => {
    return tasks.filter(t => !t.isArchived);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = allTasks;
    
    // Status filter
    if (taskFilter === 'pending') {
      filtered = filtered.filter(t => t.status !== 'completed');
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    } else if (taskFilter === 'today') {
      filtered = filtered.filter(t => 
        t.dueDate === todayStr || t.scheduledFor === todayStr
      );
    } else if (taskFilter === 'overdue') {
      filtered = filtered.filter(t => {
        if (t.status === 'completed' || !t.dueDate) return false;
        return t.dueDate < todayStr;
      });
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Date filter based on dateFilterOption
    if (dateFilterOption !== 'all') {
      if (dateFilterOption === 'today' || dateFilterOption === 'tomorrow' || dateFilterOption === 'custom') {
        if (selectedDate) {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          filtered = filtered.filter(t => 
            t.dueDate === dateStr || t.scheduledFor === dateStr
          );
        }
      } else if (dateFilterOption === 'this_week') {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        filtered = filtered.filter(t => {
          const taskDate = t.dueDate || t.scheduledFor;
          if (!taskDate) return false;
          const date = new Date(taskDate);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });
      } else if (dateFilterOption === 'this_month') {
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        filtered = filtered.filter(t => {
          const taskDate = t.dueDate || t.scheduledFor;
          if (!taskDate) return false;
          const date = new Date(taskDate);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
      } else if (dateFilterOption === 'no_date') {
        filtered = filtered.filter(t => !t.dueDate && !t.scheduledFor);
      } else if (dateFilterOption === 'overdue') {
        filtered = filtered.filter(t => {
          if (t.status === 'completed' || !t.dueDate) return false;
          return t.dueDate < todayStr;
        });
      }
    }

    // Filter by selected projects
    if (selectedProjectIds.length > 0) {
      filtered = filtered.filter(t => 
        t.projectId && selectedProjectIds.includes(t.projectId)
      );
    }
    
    // Color filter
    if (colorFilter !== 'all') {
      filtered = filtered.filter(t => t.color === colorFilter);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.categoryId === categoryFilter);
    }
    
    // Goal filter (linked goal)
    if (goalFilter !== 'all') {
      filtered = filtered.filter(t => t.linkedGoalId === goalFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    // Sort tasks
    const sorted = [...filtered].sort((a, b) => {
      switch (taskSort) {
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'date':
          const dateA = a.dueDate || a.scheduledFor || '9999-12-31';
          const dateB = b.dueDate || b.scheduledFor || '9999-12-31';
          return dateA.localeCompare(dateB);
        case 'status':
          return statusOrder[a.status] - statusOrder[b.status];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [allTasks, taskFilter, searchQuery, taskSort, selectedProjectIds, priorityFilter, statusFilter, selectedDate, todayStr, colorFilter, categoryFilter, goalFilter, dateFilterOption]);

  const toggleProjectFilter = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const hasActiveFilters = selectedProjectIds.length > 0 || priorityFilter !== 'all' || statusFilter !== 'all' || dateFilterOption !== 'all' || colorFilter !== 'all' || categoryFilter !== 'all' || goalFilter !== 'all';
  
  const activeFiltersCount = [
    selectedProjectIds.length > 0,
    priorityFilter !== 'all',
    statusFilter !== 'all',
    dateFilterOption !== 'all',
    colorFilter !== 'all',
    categoryFilter !== 'all',
    goalFilter !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedProjectIds([]);
    setPriorityFilter('all');
    setStatusFilter('all');
    setDateFilterOption('all');
    setSelectedDate(undefined);
    setTaskFilter('all');
    setColorFilter('all');
    setCategoryFilter('all');
    setGoalFilter('all');
  };
  
  // Helper functions
  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category?.name || 'Categoria';
  };
  
  const getGoalName = (id: string) => {
    const goal = goals.find(g => g.id === id);
    return goal?.title || 'Meta';
  };
  
  const getColorLabel = (color: string) => {
    const opt = colorOptions.find(c => c.id === color);
    return opt?.label || 'Cor';
  };

  const taskCounts = useMemo(() => ({
    all: allTasks.length,
    pending: allTasks.filter(t => t.status !== 'completed').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
  }), [allTasks]);

  // Get root-level tasks or children of current parent
  const visibleTasks = tasks.filter((t) => t.parentId === currentParentId);

  // Filtered hierarchy tasks (applies same filters as list view)
  const filteredHierarchyTasks = useMemo(() => {
    let filtered = visibleTasks.filter(t => !t.isArchived);
    
    if (taskFilter === 'pending') {
      filtered = filtered.filter(t => t.status !== 'completed');
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }

    // Filter by selected projects
    if (selectedProjectIds.length > 0) {
      filtered = filtered.filter(t => 
        t.projectId && selectedProjectIds.includes(t.projectId)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    // Sort tasks
    const sorted = [...filtered].sort((a, b) => {
      switch (taskSort) {
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'date':
          const dateA = a.dueDate || a.scheduledFor || '9999-12-31';
          const dateB = b.dueDate || b.scheduledFor || '9999-12-31';
          return dateA.localeCompare(dateB);
        case 'status':
          return statusOrder[a.status] - statusOrder[b.status];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [visibleTasks, taskFilter, searchQuery, taskSort, selectedProjectIds]);

  // Get project for a task
  const getProjectForTask = (task: Task) => {
    return projects.find(p => p.id === task.projectId);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 lg:pb-4 overflow-x-hidden">
      {/* Header - Fixed, no scroll */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 z-50 py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        {/* Title Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
          <div className="flex items-center gap-2">
            {/* Filter & Sort Popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    'h-8 w-8 p-0 relative',
                    hasActiveFilters && 'border-primary text-primary'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 max-h-[80vh] overflow-y-auto" align="end">
                <div className="space-y-4">
                  {/* Header with clear */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Filtros</span>
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

                  {/* Date Filter with Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Data</Label>
                    <Select value={dateFilterOption} onValueChange={(value) => handleDateFilterChange(value as DateFilterOption)}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Todas as datas" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFilterOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Show calendar for custom date */}
                    {dateFilterOption === 'custom' && (
                      <div className="space-y-2">
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
                                className={cn(
                                  'flex-1 h-8 text-xs justify-center',
                                  selectedDate && 'border-primary text-primary'
                                )}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : 'Selecionar data'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center" sideOffset={4}>
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  setSelectedDate(date);
                                  setDatePickerOpen(false);
                                }}
                                className={cn("p-3 pointer-events-auto")}
                                locale={ptBR}
                                initialFocus
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
                      </div>
                    )}
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Prioridade</Label>
                    <div className="flex gap-1 flex-wrap">
                      {([
                        { id: 'all' as PriorityFilter, label: 'Todas' },
                        { id: 'urgent' as PriorityFilter, label: '🔴 Urgente' },
                        { id: 'high' as PriorityFilter, label: '🟠 Alta' },
                        { id: 'medium' as PriorityFilter, label: '🟡 Média' },
                        { id: 'low' as PriorityFilter, label: '🟢 Baixa' },
                      ]).map((p) => (
                        <Button
                          key={p.id}
                          variant={priorityFilter === p.id ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setPriorityFilter(p.id)}
                        >
                          {p.label}
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
                        { id: 'pending' as StatusFilter, label: '⏳ Pendente' },
                        { id: 'in_progress' as StatusFilter, label: '🔄 Em Progresso' },
                        { id: 'blocked' as StatusFilter, label: '🚫 Bloqueada' },
                        { id: 'completed' as StatusFilter, label: '✅ Concluída' },
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

                  {/* Sort Section */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
                    <Select value={taskSort} onValueChange={(value) => setTaskSort(value as TaskSort)}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Prioridade</SelectItem>
                        <SelectItem value="date">Vencimento (mais próximo)</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="created">Recentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Filter Section */}
                  {projects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Projeto</Label>
                      <Select 
                        value={selectedProjectIds[0] || 'all'} 
                        onValueChange={(value) => setSelectedProjectIds(value === 'all' ? [] : [value])}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Todos os projetos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os projetos</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="h-2 w-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: project.color }}
                                />
                                <span className="truncate">{project.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as categorias</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{cat.icon}</span>
                                <span className="truncate">{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Goal Filter (Linked Goals) */}
                  {goals.filter(g => g.goalType === 'measurable').length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Meta vinculada</Label>
                      <Select value={goalFilter} onValueChange={setGoalFilter}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <Target className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Todas as metas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as metas</SelectItem>
                          {goals.filter(g => g.goalType === 'measurable').map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              <div className="flex items-center gap-1.5">
                                <Icon3D icon={goal.icon} size="sm" />
                                <span className="truncate">{goal.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCreateTask}
              className="gap-1 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active filters display and counter */}
        {(hasActiveFilters || filteredTasks.length !== allTasks.length) && (
          <div className="mb-3 space-y-2">
            {/* Filter tags */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {dateFilterOption !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    📅 {getDateQuickLabel(dateFilterOption, selectedDate)}
                    <button onClick={() => { setDateFilterOption('all'); setSelectedDate(undefined); }} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {priorityFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    {priorityFilter === 'urgent' ? '🔴' : priorityFilter === 'high' ? '🟠' : priorityFilter === 'medium' ? '🟡' : '🟢'} {priorityFilter === 'urgent' ? 'Urgente' : priorityFilter === 'high' ? 'Alta' : priorityFilter === 'medium' ? 'Média' : 'Baixa'}
                    <button onClick={() => setPriorityFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    {statusFilter === 'pending' ? '⏳ Pendente' : statusFilter === 'in_progress' ? '🔄 Em Progresso' : statusFilter === 'blocked' ? '🚫 Bloqueada' : '✅ Concluída'}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedProjectIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    📁 {projects.find(p => p.id === selectedProjectIds[0])?.title || 'Projeto'}
                    <button onClick={() => setSelectedProjectIds([])} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {colorFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: colorFilter }}
                    />
                    {getColorLabel(colorFilter)}
                    <button onClick={() => setColorFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {categoryFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    🏷️ {getCategoryName(categoryFilter)}
                    <button onClick={() => setCategoryFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {goalFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0">
                    🎯 {getGoalName(goalFilter)}
                    <button onClick={() => setGoalFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
            
            {/* Counter */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Mostrando {filteredTasks.length} de {allTasks.length} tarefas
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-3 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-border/10 bg-card/50 backdrop-blur-md w-full"
          />
        </div>

        {/* View Mode Selector - Compact grid on mobile */}
        <div className="flex justify-between gap-1 w-full p-1 rounded-xl bg-card/50 backdrop-blur-md border border-border/10">
          {viewModeConfig.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  isActive
                    ? 'gradient-bg text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate max-w-full">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Breadcrumb for hierarchy view */}
        {viewMode === 'hierarchy' && <HierarchyBreadcrumb className="mt-3 overflow-hidden" />}
      </motion.header>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden pt-4">
        {/* KANBAN VIEW - Horizontal scroll with drag & drop */}
        {viewMode === 'kanban' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <KanbanBoard tasks={tasks} onEditTask={handleEditTask} />
          </div>
        )}

        {/* OTHER VIEWS - Vertical scroll only */}
        {viewMode !== 'kanban' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex-1 overflow-y-auto overflow-x-hidden pb-4 space-y-6"
          >
            {/* List View - Today's Tasks */}
            {viewMode === 'list' && (
              <motion.section variants={item}>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 p-1 rounded-xl bg-card/50 backdrop-blur-md border border-border/10 w-fit">
                  {([
                    { id: 'all' as TaskFilter, label: 'Todas', count: taskCounts.all },
                    { id: 'pending' as TaskFilter, label: 'Pendentes', count: taskCounts.pending },
                    { id: 'completed' as TaskFilter, label: 'Concluídas', count: taskCounts.completed },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTaskFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        taskFilter === tab.id
                          ? 'gradient-bg text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {tab.label} {tab.count}
                    </button>
                  ))}
                </div>

                {/* Task List */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <SwipeableItem
                          key={task.id}
                          onDelete={() => {
                            deleteTask(task.id);
                            toast({ title: 'Tarefa excluída' });
                          }}
                        >
                          <SimpleTaskCard
                            task={task}
                            onEdit={handleViewTask}
                          />
                        </SwipeableItem>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          Nenhuma tarefa para hoje 🎉
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Aproveite o dia livre ou adicione uma tarefa
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* Hierarchy View */}
            {viewMode === 'hierarchy' && (
              <motion.section variants={item}>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                  {([
                    { id: 'all' as TaskFilter, label: 'Todas', count: taskCounts.all },
                    { id: 'pending' as TaskFilter, label: 'Pendentes', count: taskCounts.pending },
                    { id: 'completed' as TaskFilter, label: 'Concluídas', count: taskCounts.completed },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTaskFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        taskFilter === tab.id
                          ? 'gradient-bg text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tab.label} {tab.count}
                    </button>
                  ))}
                </div>

                {/* Task Hierarchy */}
                {filteredHierarchyTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredHierarchyTasks.map((task) => (
                      <SwipeableItem
                        key={task.id}
                        onDelete={() => {
                          deleteTask(task.id);
                          toast({ title: 'Tarefa excluída' });
                        }}
                      >
                        <HierarchyTaskCard 
                          task={task} 
                          onNavigateInto={handleNavigateInto}
                          onEdit={handleViewTask}
                        />
                      </SwipeableItem>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <ListTodo className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {currentParentId ? 'Nenhum item aqui' : 'Nenhuma tarefa ainda'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mb-4">
                      {currentParentId 
                        ? 'Adicione subtarefas para detalhar este item.'
                        : 'Crie sua primeira tarefa para começar.'}
                    </p>
                    <Button onClick={handleOpenCreateTask} size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Nova Tarefa
                    </Button>
                  </div>
                )}
              </motion.section>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <motion.section variants={item}>
                <TaskTimelineView
                  tasks={tasks}
                  projects={projects}
                  onEditTask={handleEditTask}
                />
              </motion.section>
            )}
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskForm
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        parentTaskId={currentParentId || undefined}
      />
      <TaskDetailView 
        task={selectedTask} 
        open={!!selectedTask} 
        onOpenChange={(open) => !open && setSelectedTask(null)} 
      />
    </div>
  );
}
