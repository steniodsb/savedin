import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderTree, BarChart3, Target, Plus, Calendar, Pipette, Sparkles } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGradientColors } from '@/hooks/useGradientColors';
import { useCategoriesData } from '@/hooks/useCategoriesData';
import { Goal } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { IconPicker, Icon3D } from '@/components/ui/icon-picker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Special value for system color
const SYSTEM_COLOR = 'system';

// ============= Types =============

interface GoalGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal; // If passed, edit mode
  onSuccess?: () => void;
  defaultGroupId?: string | null; // Pre-select group when creating
}

// ============= Constants =============

const COLOR_PALETTE = [
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6B7280', // Gray
];

const VALUE_UNITS = [
  'R$',
  'kg',
  'km',
  'livros',
  'páginas',
  'horas',
  'dias',
  'meses',
  'pontos',
  '%',
];

// ============= Sub-components =============

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'group' | 'category';
  onCreated: (item: { id: string; name: string; icon: string; color: string }) => void;
}

function CreateItemDialog({ open, onOpenChange, type, onCreated }: CreateItemDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(type === 'group' ? '📁' : '🏷️');
  const [color, setColor] = useState('#3B82F6');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      if (type === 'group') {
        const { data, error } = await supabase
          .from('goal_groups')
          .insert({
            user_id: user.id,
            name: name.trim(),
            icon,
            color,
            description: description.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['goal-groups'] });
        onCreated({ id: data.id, name: data.name, icon: data.icon, color: data.color });
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: name.trim(),
            icon,
            color,
            type: 'goal',
            is_system: false,
            sort_order: 999,
          })
          .select()
          .single();

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        onCreated({ id: data.id, name: data.name, icon: data.icon, color: data.color });
      }

      toast.success(`${type === 'group' ? 'Grupo' : 'Categoria'} criado(a)!`);
      onOpenChange(false);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(`Erro ao criar ${type === 'group' ? 'grupo' : 'categoria'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {type === 'group' ? 'Novo Grupo' : 'Nova Categoria'}
          </DialogTitle>
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
                placeholder={type === 'group' ? 'Ex: Metas 2026' : 'Ex: Saúde'}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Cor</Label>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              {COLOR_PALETTE.map((c) => (
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
                      !COLOR_PALETTE.includes(color) && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={!COLOR_PALETTE.includes(color) ? { 
                      backgroundColor: color,
                      borderStyle: 'solid',
                      borderColor: 'transparent'
                    } : undefined}
                    title="Cor personalizada"
                  >
                    {COLOR_PALETTE.includes(color) && (
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

          <div>
            <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente..."
              rows={2}
              className="resize-none"
            />
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

export function GoalFormModal({ open, onOpenChange, goal, onSuccess, defaultGroupId }: GoalFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { color1, color2, color3, contrastColor: gradientContrastColor } = useGradientColors();
  const isEditMode = !!goal;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState<string>(SYSTEM_COLOR);
  const [goalType, setGoalType] = useState<'project' | 'measurable'>('project');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [noDeadline, setNoDeadline] = useState(false);
  const [currentValue, setCurrentValue] = useState('0');
  const [targetValue, setTargetValue] = useState('');
  const [valueUnit, setValueUnit] = useState('R$');
  const [isDescending, setIsDescending] = useState(false); // false = gain, true = lose
  const [loading, setLoading] = useState(false);

  // Sub-dialogs
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Fetch goal groups
  const { data: groups = [] } = useQuery<GoalGroup[]>({
    queryKey: ['goal-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('goal_groups')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch categories
  const { categories } = useCategoriesData('goal');

  // Populate form when editing
  useEffect(() => {
    if (goal && open) {
      setName(goal.title);
      setDescription(goal.description || '');
      setIcon(goal.icon);
      // Handle system color: null or missing means system color
      setColor(!goal.color ? SYSTEM_COLOR : goal.color);
      setGoalType(goal.goalType || 'project');
      setGroupId((goal as unknown as { groupId?: string }).groupId || null);
      setCategoryId(null); // Would need to fetch from goal
      setStartDate(goal.startDate ? new Date(goal.startDate) : undefined);
      setDeadline(goal.endDate ? new Date(goal.endDate) : undefined);
      setNoDeadline(!goal.endDate);
      setCurrentValue(goal.currentValue?.toString() || '0');
      setTargetValue(goal.targetValue?.toString() || '');
      setValueUnit(goal.valueUnit || 'R$');
      setIsDescending(goal.isDescending || false);
    } else if (!goal && open) {
      resetForm();
      // Set default group if provided
      if (defaultGroupId) {
        setGroupId(defaultGroupId);
      }
    }
  }, [goal, open, defaultGroupId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('🎯');
    setColor(SYSTEM_COLOR); // Default to system color
    setGoalType('project');
    setGroupId(null);
    setCategoryId(null);
    setStartDate(new Date());
    setDeadline(undefined);
    setNoDeadline(false);
    setCurrentValue('0');
    setTargetValue('');
    setValueUnit('R$');
    setIsDescending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validations
    if (!name.trim()) {
      toast.error('O nome da meta é obrigatório');
      return;
    }

    if (!startDate) {
      toast.error('A data de início é obrigatória');
      return;
    }

    if (goalType === 'measurable') {
      const target = parseFloat(targetValue);
      if (!targetValue || isNaN(target) || target <= 0) {
        toast.error('O valor meta deve ser maior que 0');
        return;
      }
    }

    if (deadline && startDate && deadline < startDate) {
      toast.error('O prazo final deve ser após a data de início');
      return;
    }

    setLoading(true);

    try {
      // Calculate progress for measurable goals
      let progress = 0;
      if (goalType === 'measurable' && targetValue) {
        const current = parseFloat(currentValue) || 0;
        const target = parseFloat(targetValue);
        
        if (isDescending) {
          // For descending goals (weight loss): progress = how much we've reduced from initial
          // If current >= initial, progress = 0. If current <= target, progress = 100.
          // Since we're just starting, initial = current, so progress starts at 0
          progress = current <= target ? 100 : 0;
        } else {
          // For ascending goals (savings): progress = current / target
          progress = Math.min(100, Math.round((current / target) * 100));
        }
      }

      const goalData = {
        user_id: user.id,
        title: name.trim(),
        description: description.trim() || null,
        icon,
        color: color === SYSTEM_COLOR ? null : color, // Save null for system color
        goal_type: goalType,
        group_id: groupId,
        category_id: categoryId,
        start_date: startDate?.toISOString().split('T')[0] || null,
        end_date: noDeadline ? null : deadline?.toISOString().split('T')[0] || null,
        is_measurable: goalType === 'measurable',
        current_value: goalType === 'measurable' ? parseFloat(currentValue) || 0 : null,
        target_value: goalType === 'measurable' ? parseFloat(targetValue) || null : null,
        value_unit: goalType === 'measurable' ? valueUnit : null,
        is_descending: goalType === 'measurable' ? isDescending : false,
        progress,
        status: 'in_progress' as const,
        category: 'personal' as const, // Default category enum
        depth: 0,
        children_ids: [],
      };

      if (isEditMode && goal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
        toast.success('Meta atualizada!');
      } else {
        const { error } = await supabase
          .from('goals')
          .insert(goalData);

        if (error) throw error;
        toast.success('Meta criada!');
      }

      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (value: string) => {
    if (value === 'create-new') {
      setShowCreateGroup(true);
    } else if (value === 'none') {
      setGroupId(null);
    } else {
      setGroupId(value);
    }
  };

  const handleCategorySelect = (value: string) => {
    if (value === 'create-new') {
      setShowCreateCategory(true);
    } else if (value === 'none') {
      setCategoryId(null);
    } else {
      setCategoryId(value);
    }
  };

  const handleGroupCreated = (item: { id: string }) => {
    setGroupId(item.id);
  };

  const handleCategoryCreated = (item: { id: string }) => {
    setCategoryId(item.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          {/* Header */}
          <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                {isEditMode ? 'Editar Meta' : 'Nova Meta'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
            {/* Icon + Name */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Label className="text-xs text-muted-foreground block mb-1.5">Ícone</Label>
                <IconPicker value={icon} onChange={setIcon} size="lg" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Nome da meta *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Terminar SaveDin, Economizar R$50k"
                  className="mt-1.5"
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que você quer alcançar..."
                rows={3}
                className="mt-1.5 resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                {/* System color option - first */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full transition-all flex items-center justify-center relative overflow-hidden",
                        color === SYSTEM_COLOR 
                          ? "ring-2 ring-offset-2 ring-primary scale-110" 
                          : "hover:scale-110 border-2 border-border hover:border-primary/50"
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

                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      color === c
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                
                {/* Custom color picker */}
                <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                        "bg-muted border-2 border-dashed border-border hover:border-primary/50",
                        color !== SYSTEM_COLOR && !COLOR_PALETTE.includes(color) && "ring-2 ring-offset-2 ring-primary scale-110"
                      )}
                      style={color !== SYSTEM_COLOR && !COLOR_PALETTE.includes(color) ? { 
                        backgroundColor: color,
                        borderStyle: 'solid',
                        borderColor: 'transparent'
                      } : undefined}
                      title="Cor personalizada"
                    >
                      {(color === SYSTEM_COLOR || COLOR_PALETTE.includes(color)) && (
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
                          className="w-6 h-6 rounded-full border border-border"
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

            <div className="border-t" />

            {/* Goal Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de Meta</Label>
              <RadioGroup
                value={goalType}
                onValueChange={(value) => setGoalType(value as 'project' | 'measurable')}
                className="mt-2 space-y-2"
              >
                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    goalType === 'project'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="project" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary" />
                      <span className="font-medium">Projeto Complexo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Progresso por tarefas vinculadas. Ex: Lançar produto, Montar empresa
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    goalType === 'measurable'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value="measurable" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span className="font-medium">Meta Mensurável</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Progresso com valor numérico. Ex: Economizar X, Perder Y kg
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Measurable Fields (conditional) */}
            <AnimatePresence>
              {goalType === 'measurable' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Valores</span>
                    </div>

                    {/* Goal Direction - Gain or Lose */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Direção da Meta</Label>
                      <div className="flex gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDescending(false)}
                          className={cn(
                            "flex-1 p-3 rounded-lg border-2 transition-all text-center",
                            !isDescending
                              ? "border-green-500 bg-green-500/10 text-green-600"
                              : "border-border hover:border-green-500/50"
                          )}
                        >
                          <span className="text-lg">📈</span>
                          <p className="text-sm font-medium mt-1">Aumentar</p>
                          <p className="text-xs text-muted-foreground">Ex: Economizar, Ganhar</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDescending(true)}
                          className={cn(
                            "flex-1 p-3 rounded-lg border-2 transition-all text-center",
                            isDescending
                              ? "border-orange-500 bg-orange-500/10 text-orange-600"
                              : "border-border hover:border-orange-500/50"
                          )}
                        >
                          <span className="text-lg">📉</span>
                          <p className="text-sm font-medium mt-1">Reduzir</p>
                          <p className="text-xs text-muted-foreground">Ex: Perder peso, Gastar menos</p>
                        </button>
                      </div>
                    </div>

                    {/* Stacked layout for better UX */}
                    <div className="space-y-3">
                      {/* Value Initial */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {isDescending ? 'Valor Atual (Inicial)' : 'Valor Inicial'}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentValue}
                          onChange={(e) => setCurrentValue(e.target.value)}
                          placeholder={isDescending ? "72" : "0"}
                          className="mt-1.5"
                        />
                        {isDescending && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 Para metas de redução, informe seu valor atual (ex: peso atual)
                          </p>
                        )}
                      </div>

                      {/* Target Value with Unit */}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {isDescending ? 'Valor Objetivo' : 'Valor Meta *'}
                        </Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            placeholder={isDescending ? "65" : "10000"}
                            className="flex-1"
                          />
                          <Select value={valueUnit} onValueChange={setValueUnit}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VALUE_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {isDescending && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 O valor que você deseja alcançar (ex: peso desejado)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t" />

            {/* Group */}
            <div>
              <Label className="text-xs text-muted-foreground">Grupo de Metas (opcional)</Label>
              <Select
                value={groupId || 'none'}
                onValueChange={handleGroupSelect}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Nenhum grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum grupo</SelectItem>
                  {groups.length > 0 && <div className="border-t my-1" />}
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <span className="flex items-center gap-2">
                        <Icon3D icon={group.icon} size="xs" />
                        <span>{group.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                  <SelectItem value="create-new">
                    <span className="flex items-center gap-2 text-primary">
                      <Plus className="h-4 w-4" />
                      <span>Criar novo grupo...</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Grupos ajudam a organizar metas relacionadas. Ex: Metas 2026, Vida Saudável
              </p>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-muted-foreground">Categoria (opcional)</Label>
              <Select
                value={categoryId || 'none'}
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <Icon3D icon={cat.icon} size="xs" />
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                  <SelectItem value="create-new">
                    <span className="flex items-center gap-2 text-primary">
                      <Plus className="h-4 w-4" />
                      <span>Criar nova categoria...</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Classifica por área da vida. Ex: Saúde, Financeiro, Profissional
              </p>
            </div>

            <div className="border-t" />

            {/* Dates */}
            <div>
              <Label className="text-xs text-muted-foreground">Prazo</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Data de Início
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal mt-1',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, 'dd/MM/yyyy', { locale: ptBR })
                          : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Prazo Final
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={noDeadline}
                        className={cn(
                          'w-full justify-start text-left font-normal mt-1',
                          (!deadline || noDeadline) && 'text-muted-foreground',
                          noDeadline && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {deadline && !noDeadline
                          ? format(deadline, 'dd/MM/yyyy', { locale: ptBR })
                          : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        disabled={(date) =>
                          startDate ? date < startDate : false
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="noDeadline"
                  checked={noDeadline}
                  onCheckedChange={(checked) => {
                    setNoDeadline(checked as boolean);
                    if (checked) setDeadline(undefined);
                  }}
                />
                <Label
                  htmlFor="noDeadline"
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Prazo indeterminado (sem data final)
                </Label>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 bg-muted/50 border-t px-6 py-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? 'Salvando...'
                : isEditMode
                ? 'Atualizar Meta'
                : 'Criar Meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <CreateItemDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        type="group"
        onCreated={handleGroupCreated}
      />
      <CreateItemDialog
        open={showCreateCategory}
        onOpenChange={setShowCreateCategory}
        type="category"
        onCreated={handleCategoryCreated}
      />
    </>
  );
}
