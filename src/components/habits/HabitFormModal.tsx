import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGradientColors } from '@/hooks/useGradientColors';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar as CalendarIcon, Pipette, Sparkles } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Special value for system color
const SYSTEM_COLOR = 'system';

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
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconPicker, Icon3D } from '@/components/ui/icon-picker';
import type { Habit, HabitColor, TimeOfDay, HabitFrequency } from '@/types';

// Paleta de 10 cores
const COLOR_OPTIONS = [
  { id: 'blue', hex: '#3B82F6', label: 'Azul' },
  { id: 'red', hex: '#EF4444', label: 'Vermelho' },
  { id: 'pink', hex: '#EC4899', label: 'Rosa' },
  { id: 'purple', hex: '#8B5CF6', label: 'Roxo' },
  { id: 'teal', hex: '#06B6D4', label: 'Turquesa' },
  { id: 'green', hex: '#10B981', label: 'Verde' },
  { id: 'lime', hex: '#84CC16', label: 'Lima' },
  { id: 'yellow', hex: '#F59E0B', label: 'Amarelo' },
  { id: 'orange', hex: '#F97316', label: 'Laranja' },
  { id: 'gray', hex: '#6B7280', label: 'Cinza' },
];

const CATEGORY_COLORS = [
  '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
  '#10B981', '#84CC16', '#F59E0B', '#F97316', '#6B7280',
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
          type: 'habit',
          is_system: false,
          sort_order: 999,
        })
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['categories-for-habit'] });
      onCreated({ id: data.id, name: data.name, icon: data.icon, color: data.color });

      toast.success('Categoria criada!');
      onOpenChange(false);
      setName('');
      setIcon('🏷️');
      setColor('#3B82F6');
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
                placeholder="Ex: Saúde"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORY_COLORS.map((c) => (
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

// =============================================================

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: '📅 Diariamente', desc: 'Todos os dias' },
  { id: 'weekdays', label: '💼 Dias Úteis', desc: 'Segunda a Sexta' },
  { id: 'weekends', label: '🏖️ Fim de Semana', desc: 'Sábado e Domingo' },
  { id: 'times_per_week', label: '🔢 X vezes/semana', desc: 'Quantidade específica' },
  { id: 'specific_days', label: '📆 Dias Específicos', desc: 'Escolher quais dias' },
];

const TRACKING_TYPE_OPTIONS = [
  { id: 'simple', label: '✓ Simples', desc: 'Marcar feito/não feito' },
  { id: 'quantitative', label: '📊 Quantitativo', desc: 'Registrar valor numérico' },
  { id: 'checklist', label: '📋 Checklist', desc: 'Múltiplos itens' },
];

const UNITS = [
  { value: 'minutes', label: '⏰ minutos' },
  { value: 'hours', label: '⏰ horas' },
  { value: 'pages', label: '📖 páginas' },
  { value: 'liters', label: '💧 litros' },
  { value: 'km', label: '🏃 km' },
  { value: 'reps', label: '💪 repetições' },
  { value: 'kg', label: '⚖️ kg' },
  { value: 'portions', label: '🍎 porções' },
  { value: 'doses', label: '💊 doses' },
  { value: 'words', label: '📝 palavras' },
  { value: 'brl', label: '💰 R$' },
  { value: 'points', label: '🔢 pontos' },
  { value: 'glasses', label: '🥛 copos' },
  { value: 'other', label: '🔢 outro' },
];

const TIME_OF_DAY_OPTIONS: { id: TimeOfDay; label: string; emoji: string }[] = [
  { id: 'morning', label: 'Manhã', emoji: '☀️' },
  { id: 'afternoon', label: 'Tarde', emoji: '🌤️' },
  { id: 'evening', label: 'Noite', emoji: '🌙' },
  { id: 'anytime', label: 'Qualquer hora', emoji: '⏰' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'D', fullLabel: 'Domingo' },
  { id: 1, label: 'S', fullLabel: 'Segunda' },
  { id: 2, label: 'T', fullLabel: 'Terça' },
  { id: 3, label: 'Q', fullLabel: 'Quarta' },
  { id: 4, label: 'Q', fullLabel: 'Quinta' },
  { id: 5, label: 'S', fullLabel: 'Sexta' },
  { id: 6, label: 'S', fullLabel: 'Sábado' },
];

interface HabitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
  routineId?: string;
  goalId?: string;
  onSuccess?: () => void;
}

export function HabitFormModal({
  open,
  onOpenChange,
  habit,
  routineId: defaultRoutineId,
  goalId: defaultGoalId,
  onSuccess,
}: HabitFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('fire');
  const [color, setColor] = useState<string>(SYSTEM_COLOR);
  const { color1, color2, color3, contrastColor: gradientContrastColor } = useGradientColors();
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  // Contribuição para meta
  const [contributionType, setContributionType] = useState<'none' | 'simple' | 'custom' | 'milestone'>('none');
  const [contributionValue, setContributionValue] = useState('');
  
  // Frequência
  const [frequencyType, setFrequencyType] = useState('daily');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  
  // Tipo de registro
  const [trackingType, setTrackingType] = useState('simple');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('minutes');
  const [customUnit, setCustomUnit] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [requireAllItems, setRequireAllItems] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  // Datas e lembrete
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  
  // Campos extras
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [timesPerDay, setTimesPerDay] = useState(1);

  const [titleError, setTitleError] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Fetch goals - only measurable type for habits
  const { data: goals = [] } = useQuery({
    queryKey: ['goals-for-habit', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('goals')
        .select('id, title, icon, goal_type')
        .eq('user_id', user.id)
        .eq('goal_type', 'measurable')
        .is('deleted_at', null)
        .neq('status', 'achieved');
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-habit', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'habit')
        .is('deleted_at', null)
        .order('sort_order');
      return data || [];
    },
    enabled: !!user && open,
  });

  // Fetch routines
  const { data: routines = [] } = useQuery({
    queryKey: ['routines-for-habit', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('routines')
        .select('id, title, icon')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: !!user && open,
  });

  // Reset form when modal opens or habit changes
  useEffect(() => {
    if (!open) return;

    if (habit) {
      setTitle(habit.title || '');
      setDescription(habit.description || '');
      setIcon(habit.icon || 'fire');
      // Handle system color: null or undefined means system color
      const habitColor = (habit as any).color;
      setColor(!habitColor ? SYSTEM_COLOR : habitColor);
      setLinkedGoalId(habit.linkedGoalId || null);
      setCategoryId(habit.categoryId || null);
      
      // Frequência - mapear do banco
      const freq = habit.frequency || 'daily';
      if (freq === 'daily') setFrequencyType('daily');
      else if (freq === 'weekly') setFrequencyType('times_per_week');
      else if (freq === 'specific_days') setFrequencyType('specific_days');
      else setFrequencyType(freq);
      
      setTimesPerWeek((habit as any).timesPerWeek || 3);
      setSelectedDays(habit.daysOfWeek || [1, 2, 3, 4, 5]);
      setTimeOfDay(habit.timeOfDay || 'morning');
      
      // Tipo de registro
      setTrackingType((habit as any).trackingType || 'simple');
      setTargetValue((habit as any).targetValue?.toString() || '');
      setUnit((habit as any).unit || 'minutes');
      setCustomUnit((habit as any).customUnit || '');
      setChecklistItems((habit as any).checklistItems || []);
      setRequireAllItems((habit as any).requireAllItems || false);
      
      // Datas
      setStartDate((habit as any).startDate ? new Date((habit as any).startDate) : new Date());
      setEndDate((habit as any).endDate ? new Date((habit as any).endDate) : undefined);
      setReminderEnabled(!!(habit as any).reminderTime);
      setReminderTime((habit as any).reminderTime || '09:00');
      
      // Extras
      setRoutineId(habit.routineId || null);
      setEstimatedMinutes(habit.estimatedMinutes?.toString() || '');
      setTimesPerDay(habit.timesPerDay || 1);
      
      // Contribuição para meta
      setContributionType((habit as any).contributionType || 'none');
      setContributionValue((habit as any).contributionValue?.toString() || '');
    } else {
      // Reset para valores padrão
      setTitle('');
      setDescription('');
      setIcon('fire');
      setColor(SYSTEM_COLOR); // Default to system color
      setLinkedGoalId(defaultGoalId || null);
      setCategoryId(null);
      setFrequencyType('daily');
      setTimesPerWeek(3);
      setSelectedDays([1, 2, 3, 4, 5]);
      setTimeOfDay('morning');
      setTrackingType('simple');
      setTargetValue('');
      setUnit('minutes');
      setCustomUnit('');
      setChecklistItems([]);
      setRequireAllItems(false);
      setNewChecklistItem('');
      setStartDate(new Date());
      setEndDate(undefined);
      setReminderEnabled(false);
      setReminderTime('09:00');
      setRoutineId(defaultRoutineId || null);
      setEstimatedMinutes('');
      setTimesPerDay(1);
      setContributionType('none');
      setContributionValue('');
    }
    setTitleError(false);
  }, [habit, defaultRoutineId, defaultGoalId, open]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (item && !checklistItems.includes(item)) {
      setChecklistItems(prev => [...prev, item]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  // Mapear frequência para o banco
  const mapFrequencyToDb = (): HabitFrequency => {
    if (frequencyType === 'daily' || frequencyType === 'weekdays' || frequencyType === 'weekends') {
      return 'daily';
    }
    if (frequencyType === 'times_per_week') {
      return 'weekly';
    }
    if (frequencyType === 'specific_days') {
      return 'specific_days';
    }
    return 'daily';
  };

  // Mapear dias da semana baseado na frequência
  const getDaysOfWeek = (): number[] | null => {
    if (frequencyType === 'weekdays') return [1, 2, 3, 4, 5];
    if (frequencyType === 'weekends') return [0, 6];
    if (frequencyType === 'specific_days') return selectedDays;
    return null;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');

      // Handle color: null for system color, otherwise the color value
      const colorValue = color === SYSTEM_COLOR ? null : color;

      const habitData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        icon,
        color: colorValue as any, // Cast needed because types.ts expects enum, but DB now accepts null
        frequency: mapFrequencyToDb(),
        time_of_day: timeOfDay,
        specific_time: reminderEnabled ? reminderTime : null,
        days_of_week: getDaysOfWeek(),
        times_per_day: timesPerDay,
        times_per_week: frequencyType === 'times_per_week' ? timesPerWeek : null,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        linked_goal_id: linkedGoalId,
        category_id: categoryId,
        routine_id: routineId,
        is_active: true,
        // Novos campos
        tracking_type: trackingType,
        target_value: trackingType === 'quantitative' && targetValue ? parseFloat(targetValue) : null,
        unit: trackingType === 'quantitative' ? (unit === 'other' ? customUnit : unit) : null,
        custom_unit: unit === 'other' ? customUnit : null,
        checklist_items: trackingType === 'checklist' ? checklistItems : null,
        require_all_items: trackingType === 'checklist' ? requireAllItems : false,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        reminder_time: reminderEnabled ? reminderTime : null,
        // Campos de contribuição
        contribution_type: linkedGoalId ? contributionType : 'none',
        contribution_value: linkedGoalId && contributionType === 'custom' && contributionValue ? parseFloat(contributionValue) : null,
      };

      if (habit) {
        const { error } = await supabase
          .from('habits')
          .update(habitData)
          .eq('id', habit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habits')
          .insert([habitData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(habit ? 'Hábito atualizado!' : 'Hábito criado!');
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (linkedGoalId) {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      }
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao salvar hábito');
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

    if (trackingType === 'quantitative' && !targetValue) {
      toast.error('Valor meta é obrigatório para hábitos quantitativos');
      return;
    }

    if (trackingType === 'checklist' && checklistItems.length === 0) {
      toast.error('Adicione pelo menos um item ao checklist');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-lg">
            {habit ? 'Editar Hábito' : 'Novo Hábito'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <form id="habit-form" onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Ícone + Nome */}
            <div className="flex gap-3">
              <div className="shrink-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Ícone</Label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div className="flex-1">
                <Label htmlFor="title" className="text-xs text-muted-foreground">
                  Nome do hábito <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleError(false);
                  }}
                  placeholder="Ex: Beber água"
                  className={cn(
                    "mt-1",
                    titleError && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoFocus
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description" className="text-xs text-muted-foreground">
                Descrição (opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Por que este hábito é importante?"
                className="mt-1 min-h-[60px] resize-none"
              />
            </div>

            {/* Cor */}
            <div>
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2 items-center">
                {/* System color option - first, matching task form style */}
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

                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all",
                      color === c.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
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
                        color !== SYSTEM_COLOR && !COLOR_OPTIONS.some(c => c.id === color) && "border-primary ring-2 ring-primary/30"
                      )}
                      style={color !== SYSTEM_COLOR && !COLOR_OPTIONS.some(c => c.id === color) ? { 
                        backgroundColor: color.startsWith('#') ? color : '#3B82F6',
                        borderStyle: 'solid'
                      } : undefined}
                      title="Cor personalizada"
                    >
                      {(color === SYSTEM_COLOR || COLOR_OPTIONS.some(c => c.id === color)) && (
                        <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Cor personalizada</p>
                      <HexColorPicker 
                        color={COLOR_OPTIONS.find(c => c.id === color)?.hex || (color.startsWith('#') ? color : '#3B82F6')}
                        onChange={(newColor) => setColor(newColor)} 
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: COLOR_OPTIONS.find(c => c.id === color)?.hex || (color.startsWith('#') ? color : '#3B82F6') }}
                        />
                        <Input
                          value={COLOR_OPTIONS.find(c => c.id === color)?.hex || (color.startsWith('#') ? color : '#3B82F6')}
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

            {/* Meta Vinculada */}
            <div>
              <Label className="text-xs text-muted-foreground">Meta Vinculada (opcional)</Label>
              <Select
                value={linkedGoalId || 'none'}
                onValueChange={(v) => setLinkedGoalId(v === 'none' ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {goals.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-1.5">
                        <Icon3D icon={g.icon} size="xs" />
                        <span>{g.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Este hábito contribui para a meta selecionada
              </p>
            </div>

            {/* Configuração de Contribuição - aparece apenas quando meta está selecionada */}
            <AnimatePresence>
              {linkedGoalId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                    <Label className="text-xs text-muted-foreground font-semibold">
                      Como este hábito contribui para a meta?
                    </Label>
                    
                    <div className="space-y-2">
                      {/* Apenas visualização */}
                      <button
                        type="button"
                        onClick={() => setContributionType('none')}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                          contributionType === 'none' 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "bg-background/50 border border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-lg shrink-0">👁️</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Apenas visualização</p>
                          <p className="text-xs text-muted-foreground">Mostra o vínculo, mas não soma progresso</p>
                        </div>
                      </button>

                      {/* Cada conclusão +1 */}
                      <button
                        type="button"
                        onClick={() => setContributionType('simple')}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                          contributionType === 'simple' 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "bg-background/50 border border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-lg shrink-0">➕</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Cada conclusão avança +1</p>
                          <p className="text-xs text-muted-foreground">Ao completar o hábito, soma 1 no progresso da meta</p>
                        </div>
                      </button>

                      {/* Valor customizado */}
                      <button
                        type="button"
                        onClick={() => setContributionType('custom')}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                          contributionType === 'custom' 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "bg-background/50 border border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-lg shrink-0">🔢</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Valor customizado</p>
                          <p className="text-xs text-muted-foreground">Define quanto soma por conclusão</p>
                        </div>
                      </button>

                      {/* Input de valor customizado */}
                      <AnimatePresence>
                        {contributionType === 'custom' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-9 pt-2">
                              <Label className="text-xs text-muted-foreground">
                                Valor por conclusão
                              </Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={contributionValue}
                                onChange={(e) => setContributionValue(e.target.value)}
                                placeholder="Ex: 5"
                                className="mt-1 w-32"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Criar marco */}
                      <button
                        type="button"
                        onClick={() => setContributionType('milestone')}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                          contributionType === 'milestone' 
                            ? "bg-primary/10 border-2 border-primary" 
                            : "bg-background/50 border border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-lg shrink-0">🎯</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Criar marco automático</p>
                          <p className="text-xs text-muted-foreground">Cada conclusão cria um marco na meta</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Categoria */}
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
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1.5">
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

            {/* Frequência */}
            <div>
              <Label className="text-xs text-muted-foreground">Frequência</Label>
              <Select value={frequencyType} onValueChange={setFrequencyType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <SelectItem key={freq.id} value={freq.id}>
                      <span className="flex items-center gap-2">
                        <span>{freq.label}</span>
                        <span className="text-muted-foreground text-xs">– {freq.desc}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* X vezes por semana */}
              <AnimatePresence>
                {frequencyType === 'times_per_week' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <Label className="text-xs mb-2 block">Quantas vezes por semana?</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={7}
                          value={timesPerWeek}
                          onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">vezes</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Exemplo: 3 vezes por semana (qualquer 3 dias)
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dias específicos */}
              <AnimatePresence>
                {frequencyType === 'specific_days' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <Label className="text-xs mb-2 block">Selecione os dias</Label>
                      <div className="flex gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={cn(
                              "w-10 h-10 rounded-full text-sm font-medium transition-all",
                              selectedDays.includes(day.id)
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted text-foreground border border-border hover:bg-accent"
                            )}
                            title={day.fullLabel}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Horário do dia */}
            <div>
              <Label className="text-xs text-muted-foreground">Horário do dia</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTimeOfDay(opt.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-all",
                      timeOfDay === opt.id
                        ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                        : "bg-muted/80 text-foreground border border-border hover:bg-accent hover:border-primary/30"
                    )}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tipo de Registro */}
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de Registro</Label>
              <Select value={trackingType} onValueChange={setTrackingType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <span>{type.label}</span>
                        <span className="text-muted-foreground text-xs">– {type.desc}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Campos Quantitativo */}
              <AnimatePresence>
                {trackingType === 'quantitative' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h4 className="font-medium text-sm mb-3">📊 Valores</h4>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs mb-1.5 block">
                            Valor Meta <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 2, 30, 100"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label className="text-xs mb-1.5 block">Unidade</Label>
                          <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {unit === 'other' && (
                          <div>
                            <Label className="text-xs mb-1.5 block">Unidade Personalizada</Label>
                            <Input
                              placeholder="Ex: copos, vezes, sessões"
                              value={customUnit}
                              onChange={(e) => setCustomUnit(e.target.value)}
                            />
                          </div>
                        )}

                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          💡 Exemplo: Beber <strong>2 litros</strong> de água por dia
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Campos Checklist */}
              <AnimatePresence>
                {trackingType === 'checklist' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h4 className="font-medium text-sm mb-3">📋 Itens do Checklist</h4>

                      {/* Adicionar Item */}
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Ex: Acordar às 6h"
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addChecklistItem();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Lista de Itens */}
                      {checklistItems.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {checklistItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-background rounded border"
                            >
                              <span className="text-sm font-medium text-muted-foreground w-5">
                                {index + 1}.
                              </span>
                              <span className="flex-1 text-sm">{item}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => removeChecklistItem(index)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4 bg-background rounded border border-dashed mb-3">
                          Nenhum item adicionado ainda
                        </p>
                      )}

                      {/* Exigir todos os itens */}
                      <div className="flex items-center gap-2 p-2 bg-background rounded border">
                        <Checkbox
                          id="requireAll"
                          checked={requireAllItems}
                          onCheckedChange={(checked) => setRequireAllItems(checked as boolean)}
                        />
                        <Label htmlFor="requireAll" className="text-sm cursor-pointer">
                          Exigir todos os itens para concluir
                        </Label>
                      </div>

                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-3">
                        💡 Exemplo: <strong>Rotina Matinal</strong> com 5 passos
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Datas - Início e Fim */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Data de Início <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Data de Fim (opcional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Sem data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <div className="p-2 border-b">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => setEndDate(undefined)}
                      >
                        Limpar data final
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => setEndDate(date)}
                      locale={ptBR}
                      disabled={(date) => date < startDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              💡 Deixe a data final vazia para hábitos contínuos
            </p>


            {/* Lembrete */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="reminder"
                  checked={reminderEnabled}
                  onCheckedChange={(checked) => setReminderEnabled(checked as boolean)}
                />
                <Label htmlFor="reminder" className="text-sm cursor-pointer">
                  Ativar lembrete diário 📱
                </Label>
              </div>
              <AnimatePresence>
                {reminderEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-muted rounded-lg border ml-6">
                      <Label className="text-xs mb-2 block">Horário do lembrete</Label>
                      <Input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        📱 Você receberá uma notificação push todos os dias
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Campos Extras */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timesPerDay" className="text-xs text-muted-foreground">
                  Vezes por dia
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="timesPerDay"
                    type="number"
                    min={1}
                    max={99}
                    value={timesPerDay}
                    onChange={(e) => setTimesPerDay(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">vez(es)</span>
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedMinutes" className="text-xs text-muted-foreground">
                  Tempo estimado
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="estimatedMinutes"
                    type="number"
                    min={1}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="w-20"
                    placeholder="min"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            {/* Rotina */}
            {routines.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Vincular a Rotina (opcional)</Label>
                <Select
                  value={routineId || 'none'}
                  onValueChange={(v) => setRoutineId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nenhuma rotina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma rotina</SelectItem>
                    {routines.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-1.5">
                          <Icon3D icon={r.icon} size="xs" />
                          <span>{r.title}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="p-4 pt-2 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="habit-form"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Salvando...' : habit ? 'Atualizar Hábito' : 'Criar Hábito'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Mini-modal para criar categoria */}
    <CreateCategoryDialog
      open={createCategoryOpen}
      onOpenChange={setCreateCategoryOpen}
      onCreated={(newCategory) => {
        setCategoryId(newCategory.id);
      }}
    />
    </>
  );
}
