import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit2, Calendar, Clock, Flame, Target, TrendingUp, 
  Repeat, CheckCircle2, BarChart3, Undo2, Check, Trash2, Archive, Play, Timer,
  Trophy, CalendarDays, Pause, Plus, Minus
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Habit, HabitColor } from '@/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HabitFormModal } from '@/components/habits/HabitFormModal';
import { useTimer } from '@/hooks/useTimer';
import { TimerFullscreenView } from '@/components/timer/TimerFullscreenView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon3D } from '@/components/ui/icon-picker';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const colorMap: Record<HabitColor, { bg: string; text: string; accent: string; heatmap: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', accent: 'bg-red-500', heatmap: 'bg-red-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', accent: 'bg-orange-500', heatmap: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-500', accent: 'bg-yellow-500', heatmap: 'bg-yellow-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', accent: 'bg-green-500', heatmap: 'bg-green-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', accent: 'bg-teal-500', heatmap: 'bg-teal-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500', heatmap: 'bg-blue-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', accent: 'bg-purple-500', heatmap: 'bg-purple-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', accent: 'bg-pink-500', heatmap: 'bg-pink-500' },
};

const frequencyLabels: Record<string, string> = {
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  specific_days: 'Dias específicos',
  interval: 'A cada X dias',
};

const timeOfDayLabels: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  anytime: 'Qualquer hora',
};

const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface HabitDetailViewProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  selectedDate?: string; // YYYY-MM-DD format
}

export function HabitDetailView({ habit, open, onOpenChange, onEdit, selectedDate }: HabitDetailViewProps) {
  const { habitLogs, getHabitCompletionForDate, completeHabit, uncompleteHabit, deleteHabit, updateHabit } = useStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTimerView, setShowTimerView] = useState(false);
  const { getTimerForItem, canStartTimer } = useTimer();
  
  // Get tracking type from habit (with fallback to 'simple')
  const trackingType = (habit as any).trackingType || 'simple';
  const [viewType, setViewType] = useState<'simple' | 'quantitative' | 'checklist'>(trackingType);
  
  
  // Quantitative input state
  const [quantitativeValue, setQuantitativeValue] = useState('');
  
  // Checklist state
  const checklistItems: string[] = (habit as any).checklistItems || [];
  const [checkedItems, setCheckedItems] = useState<boolean[]>(checklistItems.map(() => false));
  
  useEffect(() => {
    setViewType(trackingType);
  }, [trackingType]);
  
  const activeTimer = getTimerForItem(habit.id, 'habit');
  const colors = colorMap[habit.color] || colorMap.blue;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Use selectedDate if provided, otherwise use today
  const displayDateStr = selectedDate || todayStr;
  const displayDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
  const isViewingToday = displayDateStr === todayStr;
  
  const completionForDate = getHabitCompletionForDate(habit.id, displayDateStr);
  const isCompletedForDate = completionForDate >= habit.timesPerDay;

  // Get this week's days
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Calculate weekly completion
  const weeklyCompletions = weekDays.filter(day => {
    const dateStr = day.toISOString().split('T')[0];
    return getHabitCompletionForDate(habit.id, dateStr) >= habit.timesPerDay;
  }).length;

  // Get days since creation
  const daysSinceCreation = Math.floor(
    (today.getTime() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const completionRate = daysSinceCreation > 0 
    ? Math.round((habit.totalCompletions / daysSinceCreation) * 100) 
    : 0;

  // Chart period selector
  const [chartPeriod, setChartPeriod] = useState<'7' | '30'>('7');
  
  // Generate chart data based on selected period
  const chartData = useMemo(() => {
    const daysCount = chartPeriod === '7' ? 7 : 30;
    const data: { day: string; value: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = date.toISOString().split('T')[0];
      const count = getHabitCompletionForDate(habit.id, dateStr);
      data.push({
        day: format(date, chartPeriod === '7' ? 'EEE' : 'dd/MM', { locale: ptBR }),
        value: count >= habit.timesPerDay ? 1 : 0,
      });
    }
    return data;
  }, [habit.id, habit.timesPerDay, habitLogs, today, chartPeriod]);

  // Calculate total completed in selected period
  const periodCompleted = useMemo(() => {
    return chartData.filter(d => d.value === 1).length;
  }, [chartData]);

  // Get last 7 days history with logs
  const recentHistory = useMemo(() => {
    const history: { date: Date; completed: boolean; count: number; log: typeof habitLogs[0] | null }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const dateStr = date.toISOString().split('T')[0];
      const count = getHabitCompletionForDate(habit.id, dateStr);
      const log = habitLogs.find(l => l.habitId === habit.id && l.date === dateStr) || null;
      history.push({
        date,
        completed: count >= habit.timesPerDay,
        count,
        log,
      });
    }
    return history;
  }, [habit.id, habit.timesPerDay, habitLogs, today]);

  // Get quantitative values
  const targetValue = (habit as any).targetValue || 0;
  const unit = (habit as any).unit || '';
  const currentValue = 0; // Would come from today's completion data

  // Toggle checklist item
  const toggleChecklistItem = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  // Calculate checklist progress
  const checklistProgress = checklistItems.length > 0 
    ? Math.round((checkedItems.filter(Boolean).length / checklistItems.length) * 100)
    : 0;

  return (
    <Dialog open={open && !showTimerView} onOpenChange={(v) => { if (!showTimerView) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header with color accent */}
        <div className={cn('relative p-6 pb-4 shrink-0', colors.bg)}>
          <div className={cn('absolute left-0 top-0 bottom-0 w-1', colors.accent)} />
          
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors shadow-sm z-10"
          >
            <X className="h-4 w-4" />
          </motion.button>
          
          <div className="flex items-start gap-4">
          {habit.icon && (
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              'bg-background/80 backdrop-blur-sm shadow-sm'
            )}>
              <Icon3D icon={habit.icon} size="xl" className="text-3xl" />
            </div>
          )}
            
            <div className="flex-1 min-w-0 pr-10">
              <h2 className="text-xl font-semibold text-foreground">{habit.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={habit.isActive ? 'default' : 'secondary'} className="text-xs">
                  {habit.isActive ? '⏰ Ativo' : '⏸️ Pausado'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {trackingType === 'simple' && '✓ Simples'}
                  {trackingType === 'quantitative' && '📊 Quantitativo'}
                  {trackingType === 'checklist' && '📋 Checklist'}
                </Badge>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  colors.bg, colors.text
                )}>
                  <Repeat className="h-3 w-3" />
                  {frequencyLabels[habit.frequency]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Type Indicator (Read-only) */}
        <div className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-4 justify-center">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              trackingType === 'simple' ? colors.text : "text-muted-foreground/40"
            )}>
              <Check className="h-3.5 w-3.5" />
              <span>Simples</span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              trackingType === 'quantitative' ? colors.text : "text-muted-foreground/40"
            )}>
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Quantitativo</span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              trackingType === 'checklist' ? colors.text : "text-muted-foreground/40"
            )}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Checklist</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Stats Grid - 3 items only */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10 text-center">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{habit.currentStreak}</p>
                <p className="text-[10px] text-muted-foreground">Atual</p>
              </div>
              
              <div className="p-3 rounded-xl bg-purple-500/10 text-center">
                <Trophy className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{habit.longestStreak}</p>
                <p className="text-[10px] text-muted-foreground">Recorde</p>
              </div>
              
              <div className="p-3 rounded-xl bg-green-500/10 text-center">
                <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{habit.totalCompletions}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Description */}
            {habit.description && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">{habit.description}</p>
              </div>
            )}

            <Separator />

            {/* Line Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Histórico
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {periodCompleted}/{chartPeriod === '7' ? 7 : 30} dias
                  </span>
                  <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
                    <button
                      onClick={() => setChartPeriod('7')}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-all",
                        chartPeriod === '7' 
                          ? "bg-background shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      7d
                    </button>
                    <button
                      onClick={() => setChartPeriod('30')}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition-all",
                        chartPeriod === '30' 
                          ? "bg-background shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      30d
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      interval={chartPeriod === '7' ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis 
                      domain={[0, 1]} 
                      hide 
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border border-border rounded-md px-2 py-1 text-xs shadow-md">
                              {payload[0].value === 1 ? '✓ Feito' : '✗ Não feito'}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={`hsl(var(--${habit.color === 'red' ? 'destructive' : habit.color === 'blue' ? 'primary' : habit.color}-500))`}
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--background))', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      className={colors.text.replace('text-', 'stroke-')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Separator />

            {/* CONTENT BY TYPE */}
            <AnimatePresence mode="wait">
              {/* SIMPLE TYPE */}
              {viewType === 'simple' && (
                <motion.div
                  key="simple"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Today's Progress */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">
                        Progresso {isViewingToday ? 'de hoje' : 'do dia'}
                      </span>
                      {isCompletedForDate && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluído
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={(completionForDate / habit.timesPerDay) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className={cn('text-sm font-medium tabular-nums', colors.text)}>
                        {completionForDate}/{habit.timesPerDay}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      {!isCompletedForDate && (
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => completeHabit(habit.id, displayDateStr)}
                        >
                          <Check className="h-4 w-4" />
                          Marcar como feito
                        </Button>
                      )}
                      {completionForDate > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => uncompleteHabit(habit.id, displayDateStr)}
                        >
                          <Undo2 className="h-4 w-4" />
                          Desfazer
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      ✓ Hábito simples — apenas marque como feito ou não feito
                    </p>
                  </div>
                </motion.div>
              )}

              {/* QUANTITATIVE TYPE */}
              {viewType === 'quantitative' && (
                <motion.div
                  key="quantitative"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Value Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Atual</p>
                        <p className="text-2xl font-bold text-foreground">{currentValue}</p>
                        <p className="text-xs text-muted-foreground">{unit}</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Meta</p>
                        <p className="text-2xl font-bold text-primary">{targetValue}</p>
                        <p className="text-xs text-muted-foreground">{unit}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Faltam</p>
                        <p className="text-2xl font-bold text-foreground">{Math.max(0, targetValue - currentValue)}</p>
                        <p className="text-xs text-muted-foreground">{unit}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add Value Input */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm font-medium mb-3">Adicionar progresso</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          const val = parseFloat(quantitativeValue) || 0;
                          if (val > 1) setQuantitativeValue((val - 1).toString());
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={quantitativeValue}
                        onChange={(e) => setQuantitativeValue(e.target.value)}
                        placeholder="0"
                        className="text-center text-lg font-bold w-24"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          const val = parseFloat(quantitativeValue) || 0;
                          setQuantitativeValue((val + 1).toString());
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">{unit}</span>
                    </div>
                    <Button className="w-full mt-3 gap-2" onClick={() => {
                      toast.success(`+${quantitativeValue} ${unit} registrado!`);
                      setQuantitativeValue('');
                    }}>
                      <Plus className="h-4 w-4" />
                      Registrar
                    </Button>
                  </div>

                  {/* Timer Section */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      {habit.estimatedMinutes ? (
                        <span className="text-sm text-muted-foreground">
                          ⏱️ Tempo estimado: <span className="font-medium text-foreground">{habit.estimatedMinutes} min</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem tempo estimado
                        </span>
                      )}
                    </div>
                    
                    {activeTimer ? (
                      <Button
                        onClick={() => setShowTimerView(true)}
                        className="w-full gap-2"
                        variant="secondary"
                      >
                        <Play className="h-4 w-4 animate-pulse" />
                        Ver Cronômetro Ativo
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowTimerView(true)}
                        className="w-full gap-2"
                        disabled={!canStartTimer}
                      >
                        <Play className="h-4 w-4" />
                        {canStartTimer ? 'Abrir Cronômetro' : 'Limite atingido'}
                      </Button>
                    )}
                  </div>

                  {/* Placeholder for chart */}
                  <div className="p-8 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">📊 Gráfico de progresso</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Visualização do histórico de evolução
                    </p>
                  </div>
                </motion.div>
              )}

              {/* CHECKLIST TYPE */}
              {viewType === 'checklist' && checklistItems.length > 0 && (
                <motion.div
                  key="checklist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Checklist Progress */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Progresso de hoje</span>
                      <span className={cn('text-sm font-bold', checklistProgress === 100 ? 'text-green-600' : 'text-foreground')}>
                        {checkedItems.filter(Boolean).length}/{checklistItems.length} ({checklistProgress}%)
                      </span>
                    </div>
                    <Progress value={checklistProgress} className="h-2" />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">📋 Itens do checklist</h4>
                    {checklistItems.map((item, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                          checkedItems[index]
                            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                            : "bg-background border-border hover:bg-muted/50"
                        )}
                        onClick={() => toggleChecklistItem(index)}
                      >
                        <Checkbox
                          checked={checkedItems[index]}
                          onCheckedChange={() => toggleChecklistItem(index)}
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          checkedItems[index] && "line-through text-muted-foreground"
                        )}>
                          {item}
                        </span>
                        {checkedItems[index] && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Item Progress Stats (mock data) */}
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-medium mb-3">📊 Progresso por item (últimos 30 dias)</h4>
                    <div className="space-y-3">
                      {checklistItems.map((item, index) => {
                        const mockRate = 60 + Math.floor(Math.random() * 35);
                        const isLowest = mockRate < 70;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="truncate max-w-[200px]">{item}</span>
                              <span className={cn(
                                "font-medium",
                                isLowest ? "text-orange-600" : "text-foreground"
                              )}>
                                {mockRate}%
                              </span>
                            </div>
                            <Progress 
                              value={mockRate} 
                              className={cn("h-1.5", isLowest && "[&>div]:bg-orange-500")}
                            />
                            {isLowest && (
                              <p className="text-[10px] text-orange-600">
                                ⚠️ Item que você mais pula
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-background rounded-lg border">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Dica:</strong> Alguns itens têm taxa de conclusão menor. 
                        Considere simplificar ou reduzir tempo/quantidade.
                      </p>
                    </div>
                  </div>

                  {/* Save checklist button */}
                  <Button 
                    className="w-full gap-2"
                    onClick={() => {
                      completeHabit(habit.id);
                      toast.success('✅ Checklist salvo!');
                    }}
                    disabled={checklistProgress === 0}
                  >
                    <Check className="h-4 w-4" />
                    Salvar progresso ({checklistProgress}%)
                  </Button>
                </motion.div>
              )}

              {viewType === 'checklist' && checklistItems.length === 0 && (
                <motion.div
                  key="checklist-empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 rounded-xl bg-muted/30 border border-dashed border-border text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    📋 Nenhum item de checklist configurado.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edite o hábito para adicionar itens.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        <div className="p-4 border-t shrink-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => {
              updateHabit(habit.id, { isActive: !habit.isActive });
              toast.success(habit.isActive ? 'Hábito pausado' : 'Hábito reativado');
            }}
          >
            {habit.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {habit.isActive ? 'Pausar' : 'Reativar'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir hábito?</AlertDialogTitle>
            <AlertDialogDescription>
              O hábito e todo seu histórico serão movidos para a lixeira por 24h antes da exclusão definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteHabit(habit.id);
                toast.success('Hábito excluído');
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Habit Modal */}
      <HabitFormModal
        habit={habit}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      {/* Timer Fullscreen View */}
      <TimerFullscreenView
        open={showTimerView}
        onClose={() => setShowTimerView(false)}
        timer={activeTimer}
        item={!activeTimer ? {
          id: habit.id,
          type: 'habit',
          name: habit.title,
          estimatedTime: habit.estimatedMinutes,
        } : undefined}
      />
    </Dialog>
  );
}
