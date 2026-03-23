import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, TrendingUp, Trophy, ChevronDown, Archive, Filter, FolderTree, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalGroupCard } from '@/components/goals/GoalGroupCard';
import { GoalGroupContainer } from '@/components/goals/GoalGroupContainer';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';
import { GoalFormModal } from '@/components/goals/GoalFormModal';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { StatCard } from '@/components/ui/stat-card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Goal } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';


type GoalCategory = 'career' | 'health' | 'finance' | 'learning' | 'personal' | 'relationships';
type GoalStatusFilter = 'all' | 'not_started' | 'in_progress' | 'achieved' | 'abandoned';
type GoalTypeFilter = 'all' | 'measurable' | 'non_measurable';

interface GoalGroupData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string | null;
}

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  career: 'Carreira',
  health: 'Saúde',
  finance: 'Finanças',
  learning: 'Aprendizado',
  personal: 'Pessoal',
  relationships: 'Relacionamentos',
};

const STATUS_LABELS: Record<GoalStatusFilter, string> = {
  all: 'Todos',
  not_started: '⏸️ Não iniciada',
  in_progress: '🔄 Em progresso',
  achieved: '🏆 Alcançada',
  abandoned: '📦 Arquivada',
};

const TYPE_LABELS: Record<GoalTypeFilter, string> = {
  all: 'Todos',
  measurable: '📊 Mensurável',
  non_measurable: '📝 Qualitativa',
};

export function GoalsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { goals, pendingGoalToView, setPendingGoalToView, deleteGoal } = useStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [achievedOpen, setAchievedOpen] = useState(false);
  const [abandonedOpen, setAbandonedOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [preselectedGroupId, setPreselectedGroupId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Filters
  const [selectedCategories, setSelectedCategories] = useState<Set<GoalCategory>>(new Set());
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<GoalTypeFilter>('all');

  // Fetch goal groups from database
  const { data: goalGroups = [] } = useQuery<GoalGroupData[]>({
    queryKey: ['goal-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('goal_groups')
        .select('id, name, icon, color, description')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Handle pending goal to view from deep link
  useEffect(() => {
    if (pendingGoalToView) {
      setSelectedGoalId(pendingGoalToView);
      setPendingGoalToView(null);
    }
  }, [pendingGoalToView, setPendingGoalToView]);

  // Get root goals only (no parent)
  const rootGoals = useMemo(() => {
    return goals.filter(g => !g.parentId);
  }, [goals]);

  // Group goals by group_id
  const goalsByGroupId = useMemo(() => {
    const map = new Map<string | null, Goal[]>();
    rootGoals.forEach(goal => {
      const groupId = goal.groupId || null;
      if (!map.has(groupId)) {
        map.set(groupId, []);
      }
      map.get(groupId)!.push(goal);
    });
    return map;
  }, [rootGoals]);

  // Goals without a group
  const goalsWithoutGroup = useMemo(() => {
    return goalsByGroupId.get(null) || [];
  }, [goalsByGroupId]);

  // Apply filters
  const filteredRootGoals = useMemo(() => {
    return rootGoals.filter(goal => {
      // Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(goal.category as GoalCategory)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && goal.status !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter === 'measurable' && !goal.isMeasurable) {
        return false;
      }
      if (typeFilter === 'non_measurable' && goal.isMeasurable) {
        return false;
      }
      return true;
    });
  }, [rootGoals, selectedCategories, statusFilter, typeFilter]);

  // Separate goals into groups and simple goals
  const { groupGoals, simpleGoals } = useMemo(() => {
    const inProgress = filteredRootGoals.filter((g) => g.status === 'in_progress' || g.status === 'not_started');
    return {
      groupGoals: inProgress.filter(g => g.childrenIds && g.childrenIds.length > 0),
      simpleGoals: inProgress.filter(g => !g.childrenIds || g.childrenIds.length === 0),
    };
  }, [filteredRootGoals]);

  const achievedGoals = filteredRootGoals.filter((g) => g.status === 'achieved');
  const abandonedGoals = filteredRootGoals.filter((g) => g.status === 'abandoned');
  
  const allActiveGoals = goals.filter(g => g.status !== 'abandoned');
  const averageProgress = allActiveGoals.length > 0
    ? Math.round(allActiveGoals.reduce((acc, g) => acc + g.progress, 0) / allActiveGoals.length)
    : 0;
  const totalAchieved = goals.filter(g => g.status === 'achieved').length;

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const toggleCategory = (category: GoalCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = selectedCategories.size > 0 || statusFilter !== 'all' || typeFilter !== 'all';

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

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoalId(goal.id);
  };

  const handleAddSubgoal = (parentId: string) => {
    setCreateParentId(parentId);
    setPreselectedGroupId(null);
    setIsCreateOpen(true);
  };

  const handleCreateNew = () => {
    setCreateParentId(null);
    setPreselectedGroupId(null);
    setIsCreateOpen(true);
  };

  const handleAddGoalToGroup = (groupId: string) => {
    setCreateParentId(null);
    setPreselectedGroupId(groupId);
    setIsCreateOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;
    
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

    if (error) {
      sonnerToast.error('Erro ao excluir grupo');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['goal-groups'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    sonnerToast.success('Grupo excluído');
  };

  const renderGoal = (goal: Goal) => {
    const hasChildren = goal.childrenIds && goal.childrenIds.length > 0;
    
    if (hasChildren) {
      return (
        <SwipeableItem
          key={goal.id}
          onDelete={() => {
            deleteGoal(goal.id);
            toast({ title: 'Meta excluída' });
          }}
        >
          <GoalGroupCard
            goal={goal}
            isExpanded={expandedGoals.has(goal.id)}
            onToggle={() => toggleGoalExpanded(goal.id)}
            onGoalClick={handleGoalClick}
            onAddSubgoal={handleAddSubgoal}
          />
        </SwipeableItem>
      );
    }
    
    return (
      <SwipeableItem
        key={goal.id}
        onDelete={() => {
          deleteGoal(goal.id);
          toast({ title: 'Meta excluída' });
        }}
      >
        <GoalCard goal={goal} onClick={() => handleGoalClick(goal)} />
      </SwipeableItem>
    );
  };

  const today = new Date();
  const todayStr = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });

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
            <h2 className="text-lg font-semibold text-foreground">Metas</h2>
            <p className="text-sm text-muted-foreground capitalize">{todayStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "gap-1 h-8 w-8 p-0",
                    hasActiveFilters && "border-primary text-primary"
                  )}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Limpar todos
                      </Button>
                    )}
                  </div>
                  
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(CATEGORY_LABELS) as GoalCategory[]).map((category) => (
                        <Button
                          key={category}
                          variant={selectedCategories.has(category) ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleCategory(category)}
                        >
                          {CATEGORY_LABELS[category]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(STATUS_LABELS) as GoalStatusFilter[]).map((status) => (
                        <Button
                          key={status}
                          variant={statusFilter === status ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setStatusFilter(status)}
                        >
                          {STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(TYPE_LABELS) as GoalTypeFilter[]).map((type) => (
                        <Button
                          key={type}
                          variant={typeFilter === type ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setTypeFilter(type)}
                        >
                          {TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateNew}
              className="gap-1 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1 mt-3">
            {Array.from(selectedCategories).map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1 text-xs">
                {CATEGORY_LABELS[cat]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                />
              </Badge>
            ))}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {STATUS_LABELS[statusFilter]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setStatusFilter('all')}
                />
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {TYPE_LABELS[typeFilter]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setTypeFilter('all')}
                />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-5 px-2 text-xs text-muted-foreground"
            >
              Limpar
            </Button>
          </div>
        )}
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5 mt-4"
      >
        {/* Quick Stats */}
        <motion.div variants={item} className="grid grid-cols-3 gap-2">
          <StatCard
            icon={Target}
            value={goals.length}
            label="Metas"
          />
          <StatCard
            icon={TrendingUp}
            value={`${averageProgress}%`}
            label="Progresso"
            variation={averageProgress > 0 ? { value: averageProgress, type: averageProgress >= 50 ? 'positive' : 'neutral' } : undefined}
          />
          <StatCard
            icon={Trophy}
            value={totalAchieved}
            label="Alcançadas"
          />
        </motion.div>

        {/* SECTION 1: Goal Groups (from goal_groups table) */}
        {goalGroups.length > 0 && (
          <motion.section variants={item}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Grupos de Metas ({goalGroups.length})
            </h3>
            <div className="space-y-4">
              {goalGroups.map(group => {
                const groupGoalsFiltered = (goalsByGroupId.get(group.id) || []).filter(g => {
                  if (selectedCategories.size > 0 && !selectedCategories.has(g.category as GoalCategory)) return false;
                  if (statusFilter !== 'all' && g.status !== statusFilter) return false;
                  if (typeFilter === 'measurable' && !g.isMeasurable) return false;
                  if (typeFilter === 'non_measurable' && g.isMeasurable) return false;
                  return true;
                });
                
                return (
                  <GoalGroupContainer
                    key={group.id}
                    group={group}
                    goals={groupGoalsFiltered}
                    onGoalClick={(goalId) => setSelectedGoalId(goalId)}
                    onAddGoal={handleAddGoalToGroup}
                    onDeleteGroup={handleDeleteGroup}
                  />
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Separator if both sections exist */}
        {goalGroups.length > 0 && goalsWithoutGroup.length > 0 && (
          <motion.div variants={item}>
            <Separator className="my-2" />
          </motion.div>
        )}

        {/* SECTION 2: Goals without group */}
        {goalsWithoutGroup.filter(g => g.status !== 'achieved' && g.status !== 'abandoned').length > 0 && (
          <motion.section variants={item}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {goalGroups.length > 0 ? 'Metas sem Grupo' : 'Em Andamento'} ({goalsWithoutGroup.filter(g => g.status !== 'achieved' && g.status !== 'abandoned').length})
            </h3>
            <div className="space-y-2">
              {goalsWithoutGroup
                .filter(g => g.status !== 'achieved' && g.status !== 'abandoned')
                .filter(g => {
                  if (selectedCategories.size > 0 && !selectedCategories.has(g.category as GoalCategory)) return false;
                  if (statusFilter !== 'all' && g.status !== statusFilter) return false;
                  if (typeFilter === 'measurable' && !g.isMeasurable) return false;
                  if (typeFilter === 'non_measurable' && g.isMeasurable) return false;
                  return true;
                })
                .map(renderGoal)}
            </div>
          </motion.section>
        )}

        {/* Parent-child Goal Groups (legacy - with children) */}
        {groupGoals.length > 0 && (
          <motion.section variants={item}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Metas com Submetas ({groupGoals.length})
            </h3>
            <div className="space-y-2">
              {groupGoals.map(renderGoal)}
            </div>
          </motion.section>
        )}

        {/* Achieved Goals - Collapsible */}
        {achievedGoals.length > 0 && (
          <motion.section variants={item}>
            <Collapsible open={achievedOpen} onOpenChange={setAchievedOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-xl bg-status-completed/10 hover:bg-status-completed/15 transition-colors">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  🏆 Alcançadas ({achievedGoals.length})
                </h2>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  achievedOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-3">
                  {achievedGoals.map(renderGoal)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.section>
        )}

        {/* Abandoned Goals - Collapsible */}
        {abandonedGoals.length > 0 && (
          <motion.section variants={item}>
            <Collapsible open={abandonedOpen} onOpenChange={setAbandonedOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors">
                <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Arquivadas ({abandonedGoals.length})
                </h2>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  abandonedOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-3">
                  {abandonedGoals.map(renderGoal)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.section>
        )}

        {/* Empty State */}
        {filteredRootGoals.length === 0 && rootGoals.length === 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Defina suas metas
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Metas claras ajudam você a manter o foco e alcançar o que realmente importa.
            </p>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground font-medium transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Criar primeira meta
            </button>
          </motion.div>
        )}

        {/* Empty state for filters */}
        {filteredRootGoals.length === 0 && rootGoals.length > 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma meta encontrada
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Tente ajustar os filtros para ver mais metas.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </motion.div>
        )}
      </motion.div>

      <GoalFormModal 
        open={isCreateOpen} 
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setCreateParentId(null);
            setPreselectedGroupId(null);
          }
        }}
        defaultGroupId={preselectedGroupId}
      />
      
      <GoalDetailsModal 
        goalId={selectedGoalId} 
        open={selectedGoalId !== null} 
        onOpenChange={(open) => !open && setSelectedGoalId(null)} 
      />
    </div>
  );
}