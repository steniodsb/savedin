import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGradientColors } from '@/hooks/useGradientColors';
import { toast } from 'sonner';
import { X, Plus, CalendarIcon, Pipette, Sparkles } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker, Icon3D } from '@/components/ui/icon-picker';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Task } from '@/types';

// Special value for system color
const SYSTEM_COLOR = 'system';

const COLORS = [
  '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6',
  '#06B6D4', '#10B981', '#84CC16', '#F59E0B',
  '#F97316', '#6B7280'
];

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Uma vez' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'custom', label: 'Personalizado' },
];

// ============= Mini-modal para criar categoria =============

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: { id: string; name: string; icon: string; color: string }) => void;
}

function CreateCategoryDialog({ open, onOpenChange, onCreated }: CreateCategoryDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: name.trim(),
          icon,
          color,
          type: 'task',
          is_system: false,
          sort_order: 999,
        })
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['categories-for-task'] });
      onCreated({ id: data.id, name: data.name, icon: data.icon, color: data.color });

      toast.success('Categoria criada!');
      onOpenChange(false);
      setName('');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Erro ao criar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Nova Categoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Ícone</Label>
              <IconPicker value={icon} onChange={setIcon} size="lg" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Trabalho"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              
              {/* Custom color picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                      "bg-muted border-2 border-dashed border-border hover:border-primary/50",
                      !COLORS.includes(color) && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={!COLORS.includes(color) ? { 
                      backgroundColor: color,
                      borderStyle: 'solid',
                      borderColor: 'transparent'
                    } : undefined}
                    title="Cor personalizada"
                  >
                    {COLORS.includes(color) && (
                      <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Cor personalizada</p>
                    <HexColorPicker color={color} onChange={setColor} />
                    <div className="flex items-center gap-2 pt-1">
                      <div 
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <Input
                        value={color}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                            setColor(val);
                          }
                        }}
                        className="h-7 text-xs font-mono uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============= Main Component =============

interface CreateTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  goalId?: string;
  parentTaskId?: string;
  defaultStartDate?: string;
  onSuccess?: () => void;
}

export function CreateTaskForm({
  open,
  onOpenChange,
  task,
  goalId: defaultGoalId,
  parentTaskId: defaultParentId,
  defaultStartDate,
  onSuccess,
}: CreateTaskFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('check');
  const [color, setColor] = useState<string>(SYSTEM_COLOR);
  const { color1, color2, color3, contrastColor: gradientContrastColor } = useGradientColors();
  const [parentId, setParentId] = useState<string | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [noDeadline, setNoDeadline] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceIntervalUnit, setRecurrenceIntervalUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [titleError, setTitleError] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isParentTask, setIsParentTask] = useState(false);

  // Fetch available parent tasks
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['available-parent-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, icon')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch goals - only project type for tasks
  const { data: goals = [] } = useQuery({
    queryKey: ['goals-for-task', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('goals')
        .select('id, title, icon, goal_type')
        .eq('user_id', user.id)
        .eq('goal_type', 'project')
        .is('deleted_at', null)
        .neq('status', 'achieved');
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-task', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'task')
        .is('deleted_at', null)
        .order('sort_order');
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch connected friends
  const { data: friends = [] } = useQuery({
    queryKey: ['connected-friends', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_connections')
        .select(`
          id,
          requester_id,
          addressee_id,
          requester:profiles!user_connections_requester_id_fkey(user_id, username, full_name, avatar_url),
          addressee:profiles!user_connections_addressee_id_fkey(user_id, username, full_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      
      if (!data) return [];
      
      return data.map(conn => {
        const friend = conn.requester_id === user.id ? conn.addressee : conn.requester;
        return {
          id: friend.user_id,
          username: friend.username,
          fullName: friend.full_name,
          avatarUrl: friend.avatar_url,
        };
      });
    },
    enabled: !!user && open,
  });

  // Filter out current task from parent options
  const parentOptions = useMemo(() => {
    if (!task) return availableTasks;
    return availableTasks.filter(t => t.id !== task.id);
  }, [availableTasks, task]);

  // Reset form when modal opens or task changes
  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setIcon(task.icon || 'check');
      // Handle system color: null or 'system' means system color
      const taskColor = (task as any).color;
      setColor(!taskColor || taskColor === 'system' ? SYSTEM_COLOR : taskColor);
      setParentId(task.parentId || null);
      setLinkedGoalId(task.linkedGoalId || null);
      setCategoryId(task.categoryId || null);
      setPriority((task.priority as 'low' | 'medium' | 'high') || 'medium');
      // Parse date and time from ISO string
      if (task.startDate) {
        const [date, time] = task.startDate.split('T');
        setStartDate(date || '');
        setStartTime(time?.substring(0, 5) || '');
      } else {
        setStartDate('');
        setStartTime('');
      }
      if (task.dueDate) {
        const [date, time] = task.dueDate.split('T');
        setDueDate(date || '');
        setDueTime(time?.substring(0, 5) || '');
      } else {
        setDueDate('');
        setDueTime('');
      }
      setNoDeadline(!task.dueDate);
      setEstimatedMinutes(task.estimatedMinutes?.toString() || '');
      setRecurrence('once');
      setTags(task.tags || []);
      setAssignees(task.assignees?.filter(a => a !== user?.id) || []);
      setReminderEnabled(false);
      setReminderTime('09:00');
    } else {
      // Creating new task - use default values from props
      setTitle('');
      setDescription('');
      setIcon('check');
      setColor(SYSTEM_COLOR); // Default to system color
      // Important: Set parent from prop when creating subtask
      setParentId(defaultParentId ?? null);
      setLinkedGoalId(defaultGoalId ?? null);
      setCategoryId(null);
      setPriority('medium');
      setStartDate(defaultStartDate || format(new Date(), 'yyyy-MM-dd'));
      setStartTime('');
      setDueDate('');
      setDueTime('');
      setNoDeadline(false);
      setEstimatedMinutes('');
      setRecurrence('once');
      setTags([]);
      setAssignees([]);
      setReminderEnabled(false);
      setReminderTime('09:00');
      setIsParentTask(false);
    }
    setTitleError(false);
    setTagInput('');
  }, [task, defaultParentId, defaultGoalId, defaultStartDate, open, user?.id]);

  // Also update parentId when defaultParentId changes while modal is open
  useEffect(() => {
    if (open && !task && defaultParentId) {
      setParentId(defaultParentId);
    }
  }, [defaultParentId, open, task]);

  // Calculate depth based on parent
  const depth = useMemo(() => {
    if (!parentId) return 0;
    const parent = availableTasks.find(t => t.id === parentId);
    if (!parent) return 0;
    return 1; // Simplified - could be enhanced to calculate full depth
  }, [parentId, availableTasks]);

  // Get level from depth
  const getLevelFromDepth = (d: number): 'project' | 'milestone' | 'task' | 'subtask' => {
    // If marked as parent task and no parent, it's a milestone (parent level)
    if (!parentId && isParentTask) return 'milestone';
    if (d === 0) return 'task';
    if (d === 1) return 'subtask';
    return 'subtask';
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');

      // Combine date + time into ISO string
      const formatDateTime = (date: string, time: string) => {
        if (!date) return null;
        if (time) {
          return `${date}T${time}:00`;
        }
        return date;
      };

      const taskData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        icon,
        color: color === SYSTEM_COLOR ? null : color, // Save null for system color
        parent_id: parentId || null,
        linked_goal_id: linkedGoalId || null,
        category_id: categoryId || null,
        priority,
        level: getLevelFromDepth(depth),
        level_label: depth === 0 ? 'Tarefa' : 'Subtarefa',
        depth,
        start_date: formatDateTime(startDate, startTime),
        due_date: noDeadline ? null : formatDateTime(dueDate, dueTime),
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        tags: tags.length > 0 ? tags : null,
        assignees: [user.id, ...assignees],
        status: task?.status || 'pending',
      };

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(task ? 'Tarefa atualizada!' : 'Tarefa criada!');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao salvar tarefa');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setTitleError(true);
      toast.error('Título é obrigatório');
      return;
    }
    
    saveMutation.mutate();
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const toggleAssignee = (friendId: string) => {
    setAssignees(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-lg">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <form id="task-form" onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Icon + Title */}
            <div className="flex gap-3">
              <div className="shrink-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Ícone</Label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div className="flex-1">
                <Label htmlFor="title" className="text-xs text-muted-foreground">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleError(false);
                  }}
                  placeholder="Ex: Implementar sistema de login"
                  className={cn(
                    "mt-1",
                    titleError && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-xs text-muted-foreground">
                Descrição (opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais..."
                className="mt-1 min-h-[80px] resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2 items-center">
                {/* System color option - first */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center relative overflow-hidden",
                        color === SYSTEM_COLOR 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-border hover:scale-110 hover:border-primary/50"
                      )}
                      onClick={() => setColor(SYSTEM_COLOR)}
                      style={{
                        background: color3 
                          ? `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`
                          : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
                      }}
                    >
                      <Sparkles className={cn("h-3.5 w-3.5 drop-shadow-sm", gradientContrastColor === 'white' ? 'text-white' : 'text-black')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Cor do Sistema</p>
                    <p className="text-xs text-muted-foreground">Segue a cor principal do tema</p>
                  </TooltipContent>
                </Tooltip>

                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all",
                      color === c 
                        ? "border-primary ring-2 ring-primary/30" 
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
                
                {/* Custom color picker */}
                <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                        "bg-muted border-2 border-dashed border-border hover:border-primary/50",
                        color !== SYSTEM_COLOR && !COLORS.includes(color) && "border-primary ring-2 ring-primary/30"
                      )}
                      style={color !== SYSTEM_COLOR && !COLORS.includes(color) ? { 
                        backgroundColor: color,
                        borderStyle: 'solid'
                      } : undefined}
                      title="Cor personalizada"
                    >
                      {(color === SYSTEM_COLOR || COLORS.includes(color)) && (
                        <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Cor personalizada</p>
                      <HexColorPicker 
                        color={color === SYSTEM_COLOR ? color1 : color} 
                        onChange={setColor} 
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <div 
                          className="w-6 h-6 rounded-lg border border-border"
                          style={{ backgroundColor: color === SYSTEM_COLOR ? color1 : color }}
                        />
                        <Input
                          value={color === SYSTEM_COLOR ? color1 : color}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                              setColor(val);
                            }
                          }}
                          className="h-7 text-xs font-mono uppercase"
                          maxLength={7}
                        />
                      </div>
                      <Button
                        type="button" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setColorPickerOpen(false)}
                      >
                        Selecionar
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Parent Task + Linked Goal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Tarefa Pai (opcional)
                </Label>
                <Select
                  value={parentId || 'none'}
                  onValueChange={(v) => setParentId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {parentOptions.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <Icon3D icon={t.icon} size="xs" />
                          <span className="truncate">{t.title}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!parentId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="isParentTask"
                      checked={isParentTask}
                      onCheckedChange={(checked) => setIsParentTask(checked === true)}
                    />
                    <Label htmlFor="isParentTask" className="text-xs text-muted-foreground cursor-pointer">
                      Marcar como Tarefa Pai
                    </Label>
                  </div>
                )}
                {parentId && (
                  <p className="text-xs text-muted-foreground mt-1">Será subtarefa</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Meta Vinculada (opcional)
                </Label>
                <Select
                  value={linkedGoalId || 'none'}
                  onValueChange={(v) => setLinkedGoalId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {goals.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="flex items-center gap-2">
                          <Icon3D icon={g.icon} size="xs" />
                          <span className="truncate">{g.title}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Contribui para esta meta</p>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-muted-foreground">Categoria (opcional)</Label>
              <Select
                value={categoryId || 'none'}
                onValueChange={(v) => {
                  if (v === 'create-new') {
                    setCreateCategoryOpen(true);
                  } else {
                    setCategoryId(v === 'none' ? null : v);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Icon3D icon={c.icon} size="xs" />
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="create-new" className="text-primary">
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Criar nova categoria...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Priority */}
            <div>
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'high' as const, label: 'Alta', bgColor: 'bg-red-500', hoverBg: 'hover:bg-red-600' },
                  { id: 'medium' as const, label: 'Média', bgColor: 'bg-yellow-500', hoverBg: 'hover:bg-yellow-600' },
                  { id: 'low' as const, label: 'Baixa', bgColor: 'bg-green-500', hoverBg: 'hover:bg-green-600' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                      priority === p.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", p.bgColor)} />
                    <span className="text-sm font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div>
              <Label className="text-xs text-muted-foreground">Datas e Horários</Label>
              
              {/* Start Date + Time */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                        onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        locale={ptBR}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
              </div>

              {/* Due Date + Time */}
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Finalização</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={noDeadline}
                        className={cn(
                          "justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground",
                          noDeadline && "opacity-50"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(parse(dueDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate ? parse(dueDate, 'yyyy-MM-dd', new Date()) : undefined}
                        onSelect={(date) => setDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        locale={ptBR}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <TimePicker
                    value={dueTime}
                    onChange={setDueTime}
                    disabled={noDeadline}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="noDeadline"
                  checked={noDeadline}
                  onCheckedChange={(checked) => {
                    setNoDeadline(checked as boolean);
                    if (checked) {
                      setDueDate('');
                      setDueTime('');
                    }
                  }}
                />
                <Label htmlFor="noDeadline" className="text-sm cursor-pointer">
                  Prazo indeterminado
                </Label>
              </div>
            </div>

            {/* Estimated Time */}
            <div>
              <Label className="text-xs text-muted-foreground">Tempo Estimado (opcional)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⏱️ Use o cronômetro para comparar tempo real vs estimado
              </p>
            </div>

            <Separator />

            {/* Recurrence */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Repetir</Label>
              <Select value={recurrence} onValueChange={(v) => {
                setRecurrence(v);
                if (v === 'once') {
                  setRecurrenceDays([]);
                  setRecurrenceInterval('1');
                }
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Conditional: Weekly - day selection */}
              {recurrence === 'weekly' && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <Label className="text-xs text-muted-foreground">Repetir nos dias:</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRecurrenceDays(prev => 
                            prev.includes(idx) 
                              ? prev.filter(d => d !== idx) 
                              : [...prev, idx]
                          );
                        }}
                        className={cn(
                          "w-9 h-9 rounded-full text-sm font-medium transition-all",
                          recurrenceDays.includes(idx)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted-foreground/20"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recurrenceDays.length === 0 
                      ? 'Selecione os dias da semana' 
                      : `${recurrenceDays.length} dia(s) selecionado(s)`}
                  </p>
                </div>
              )}

              {/* Conditional: Monthly - day of month */}
              {recurrence === 'monthly' && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <Label className="text-xs text-muted-foreground">Dia do mês:</Label>
                  <Select 
                    value={recurrenceDays[0]?.toString() || ''} 
                    onValueChange={(v) => setRecurrenceDays([parseInt(v)])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                      <SelectItem value="last">Último dia do mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Conditional: Custom interval */}
              {recurrence === 'custom' && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <Label className="text-xs text-muted-foreground">Repetir a cada:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value)}
                      className="w-20"
                    />
                    <Select value={recurrenceIntervalUnit} onValueChange={(v: 'days' | 'weeks' | 'months') => setRecurrenceIntervalUnit(v)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">dias</SelectItem>
                        <SelectItem value="weeks">semanas</SelectItem>
                        <SelectItem value="months">meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs text-muted-foreground">Tags (opcional)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Digite e pressione Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <Label className="text-xs text-muted-foreground">Responsáveis</Label>
              
              {/* Current user - always shown */}
              <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                    V
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">Você</p>
                  <p className="text-xs text-muted-foreground">(criador)</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 mb-2">Compartilhar com:</p>
              
              {friends.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 bg-muted/50 rounded-lg border border-dashed">
                  Nenhum contato disponível
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {friends.map(friend => (
                    <label
                      key={friend.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 border-2 rounded-lg cursor-pointer transition-all",
                        assignees.includes(friend.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <Checkbox
                        checked={assignees.includes(friend.id)}
                        onCheckedChange={() => toggleAssignee(friend.id)}
                      />
                      <Avatar className="w-7 h-7">
                        {friend.avatarUrl && <AvatarImage src={friend.avatarUrl} />}
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-xs">
                          {(friend.fullName || friend.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {friend.fullName || friend.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Reminder */}
            <div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reminderEnabled"
                  checked={reminderEnabled}
                  onCheckedChange={(checked) => setReminderEnabled(checked as boolean)}
                />
                <Label htmlFor="reminderEnabled" className="text-sm cursor-pointer">
                  Ativar lembrete 📱
                </Label>
              </div>

              {reminderEnabled && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                  <Label htmlFor="reminderTime" className="text-xs text-muted-foreground">
                    Horário do lembrete
                  </Label>
                  <TimePicker
                    value={reminderTime}
                    onChange={setReminderTime}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    📱 Você receberá uma notificação push neste horário
                  </p>
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-4 pt-3 border-t shrink-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="task-form"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending 
              ? 'Salvando...' 
              : task 
                ? 'Atualizar Tarefa' 
                : 'Criar Tarefa'
            }
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Mini-modal para criar categoria */}
      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={(newCategory) => {
          setCategoryId(newCategory.id);
        }}
      />
    </Dialog>
  );
}
