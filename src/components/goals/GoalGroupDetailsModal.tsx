import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, Check, Calendar, ChevronRight, Plus, Edit, Trash, 
  TrendingUp, Award, Inbox, Circle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconPicker, Icon3D } from '@/components/ui/icon-picker';

interface GoalGroupDetailsModalProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalClick?: (goalId: string) => void;
  onAddGoal?: (groupId: string) => void;
  onDelete?: () => void;
}

interface GoalFromDB {
  id: string;
  title: string;
  icon: string;
  color: string;
  progress: number;
  status: string;
  goal_type: string | null;
  end_date: string | null;
  current_value: number | null;
  target_value: number | null;
  value_unit: string | null;
}

interface GoalGroupFromDB {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  created_at: string;
}

const GROUP_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

function formatDeadline(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} dias atrasado`;
  } else if (diffDays === 0) {
    return 'Vence hoje';
  } else if (diffDays === 1) {
    return 'Amanhã';
  } else if (diffDays <= 7) {
    return `${diffDays} dias`;
  } else {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }
}

// Sub-component for detailed goal item
function GoalItemDetailed({ 
  goal, 
  onClick 
}: { 
  goal: GoalFromDB; 
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Status Checkbox */}
      <div className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-1 border-2",
        goal.status === 'achieved'
          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
          : "bg-muted text-muted-foreground border-border"
      )}>
        {goal.status === 'achieved' && (
          <Check className="w-4 h-4" />
        )}
      </div>

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${goal.color}15`,
          border: `1px solid ${goal.color}30`
        }}
      >
        <Icon3D icon={goal.icon} size="lg" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Name */}
        <p className={cn(
          "font-medium truncate",
          goal.status === 'achieved' && "line-through text-muted-foreground"
        )}>
          {goal.title}
        </p>

        {/* Type + Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" className="text-xs">
            {goal.goal_type === 'project' ? '📁 Projeto' : '📊 Mensurável'}
          </Badge>
          {goal.goal_type === 'measurable' && goal.target_value && (
            <span>
              • {goal.current_value || 0}/{goal.target_value} {goal.value_unit}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(goal.progress)}%</span>
          </div>
          <Progress value={goal.progress} className="h-1.5" />
        </div>

        {/* Deadline */}
        {goal.end_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDeadline(goal.end_date)}</span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-3" />
    </div>
  );
}

export function GoalGroupDetailsModal({
  groupId,
  open,
  onOpenChange,
  onGoalClick,
  onAddGoal,
  onDelete,
}: GoalGroupDetailsModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    icon: '📁',
    color: '#3B82F6',
    description: '',
  });

  // Fetch group details + goals
  const { data, isLoading } = useQuery({
    queryKey: ['goal-group-details', groupId],
    queryFn: async () => {
      // Fetch group
      const { data: group, error: groupError } = await supabase
        .from('goal_groups')
        .select('id, name, icon, color, description, created_at')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Fetch goals in this group
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, title, icon, color, progress, status, goal_type, end_date, current_value, target_value, value_unit')
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      return { 
        group: group as GoalGroupFromDB, 
        goals: (goals || []) as GoalFromDB[] 
      };
    },
    enabled: !!groupId && open,
  });

  const group = data?.group;
  const goals = data?.goals || [];

  // Calculations
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'achieved').length;
  const activeGoals = goals.filter(g => g.status !== 'achieved').length;
  const averageProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;

  // Top performing goal (non-completed)
  const topGoal = useMemo(() => {
    return [...goals]
      .filter(g => g.status !== 'achieved')
      .sort((a, b) => b.progress - a.progress)[0];
  }, [goals]);

  // Next deadline
  const nextDeadline = useMemo(() => {
    const goalsWithDeadline = goals
      .filter(g => g.end_date && g.status !== 'achieved')
      .map(g => ({
        goal: g,
        daysLeft: Math.ceil(
          (new Date(g.end_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
      }))
      .filter(d => d.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    
    return goalsWithDeadline[0];
  }, [goals]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      if (filter === 'active') return goal.status !== 'achieved';
      if (filter === 'completed') return goal.status === 'achieved';
      return true;
    });
  }, [goals, filter]);

  // Delete mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      // Remove group_id from all goals in this group first
      await supabase
        .from('goals')
        .update({ group_id: null })
        .eq('group_id', groupId);

      // Soft delete the group
      const { error } = await supabase
        .from('goal_groups')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo excluído');
      queryClient.invalidateQueries({ queryKey: ['goal-groups'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onOpenChange(false);
      onDelete?.();
    },
    onError: () => {
      toast.error('Erro ao excluir grupo');
    },
  });

  // Update mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase
        .from('goal_groups')
        .update({
          name: data.name,
          icon: data.icon,
          color: data.color,
          description: data.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Grupo atualizado');
      queryClient.invalidateQueries({ queryKey: ['goal-group-details', groupId] });
      queryClient.invalidateQueries({ queryKey: ['goal-groups'] });
      setShowEditDialog(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar grupo');
    },
  });

  const handleEditGroup = () => {
    if (group) {
      setEditData({
        name: group.name,
        icon: group.icon,
        color: group.color,
        description: group.description || '',
      });
      setShowEditDialog(true);
    }
  };

  const handleGoalItemClick = (goalId: string) => {
    onOpenChange(false);
    onGoalClick?.(goalId);
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : group ? (
            <>
              {/* Header */}
              <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Group Icon */}
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center border-2 flex-shrink-0"
                      style={{
                        backgroundColor: `${group.color}15`,
                        borderColor: `${group.color}30`
                      }}
                    >
                      <Icon3D icon={group.icon} size="xl" />
                    </div>

                    {/* Name + Badges */}
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl mb-2">{group.name}</DialogTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {totalGoals} {totalGoals === 1 ? 'meta' : 'metas'}
                        </Badge>
                        {completedGoals > 0 && (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            {completedGoals} {completedGoals === 1 ? 'concluída' : 'concluídas'}
                          </Badge>
                        )}
                        {activeGoals > 0 && (
                          <Badge variant="outline">
                            {activeGoals} {activeGoals === 1 ? 'ativa' : 'ativas'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <X className="w-5 h-5" />
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Overall Progress Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-primary">Progresso Geral do Grupo</h3>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={averageProgress} className="h-3" />
                      <p className="text-right text-2xl font-bold text-primary">
                        {averageProgress}%
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-background/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold">{totalGoals}</p>
                      </div>
                      <div className="bg-background/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600 mb-1">Concluídas</p>
                        <p className="text-2xl font-bold text-green-600">{completedGoals}</p>
                      </div>
                      <div className="bg-background/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-orange-600 mb-1">Pendentes</p>
                        <p className="text-2xl font-bold text-orange-600">{activeGoals}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      📊 Progresso médio calculado com base em todas as metas
                    </p>
                  </CardContent>
                </Card>

                {/* Description */}
                {group.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Criado em {format(new Date(group.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Completion Rate */}
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Taxa de Conclusão</p>
                      <p className="text-2xl font-bold">
                        {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
                      </p>
                    </CardContent>
                  </Card>

                  {/* Top Progress */}
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Award className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Maior Progresso</p>
                      {topGoal ? (
                        <>
                          <p className="text-2xl font-bold">{Math.round(topGoal.progress)}%</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {topGoal.icon} {topGoal.title}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Next Deadline */}
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-orange-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Próximo Prazo</p>
                      {nextDeadline ? (
                        <>
                          <p className="text-2xl font-bold">{nextDeadline.daysLeft}</p>
                          <p className="text-xs text-muted-foreground">dias</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {nextDeadline.goal.icon} {nextDeadline.goal.title}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem prazos</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Goals List Section */}
                <div className="space-y-4">
                  {/* Header + Filters */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold">
                      📋 Metas deste Grupo ({totalGoals})
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => onAddGoal?.(groupId)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Meta
                    </Button>
                  </div>

                  {/* Filter Tabs */}
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">
                        Todas ({totalGoals})
                      </TabsTrigger>
                      <TabsTrigger value="active">
                        Ativas ({activeGoals})
                      </TabsTrigger>
                      <TabsTrigger value="completed">
                        Concluídas ({completedGoals})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Goals List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredGoals.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Inbox className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">
                          {filter === 'all'
                            ? 'Nenhuma meta neste grupo'
                            : `Nenhuma meta ${filter === 'active' ? 'ativa' : 'concluída'}`}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Adicione metas para começar a acompanhar seu progresso
                        </p>
                        {filter === 'all' && (
                          <Button size="sm" onClick={() => onAddGoal?.(groupId)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Primeira Meta
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredGoals.map(goal => (
                        <GoalItemDetailed
                          key={goal.id}
                          goal={goal}
                          onClick={() => handleGoalItemClick(goal.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="bg-muted/30 border-t p-6 flex-shrink-0 flex-row gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleEditGroup}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Grupo
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Excluir Grupo
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              As metas deste grupo não serão excluídas, apenas ficarão sem grupo.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon + Name */}
            <div className="flex gap-3 items-center">
              <IconPicker
                value={editData.icon}
                onChange={(icon) => setEditData(prev => ({ ...prev, icon }))}
                size="lg"
              />
              <Input
                placeholder="Nome do grupo"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                className="flex-1"
              />
            </div>

            {/* Color */}
            <div>
              <Label className="text-sm">Cor</Label>
              <div className="flex gap-2 mt-2">
                {GROUP_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                      editData.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm">Descrição (opcional)</Label>
              <Textarea
                placeholder="Ex: Todas as metas que quero alcançar em 2026"
                rows={2}
                className="mt-2"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => updateGroupMutation.mutate(editData)}
              disabled={!editData.name.trim() || updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? 'Atualizando...' : 'Atualizar Grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
