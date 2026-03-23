import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreVertical, Edit, Trash, Plus, Eye, Check, Circle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Goal } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalGroupDetailsModal } from './GoalGroupDetailsModal';
import { Icon3D } from '@/components/ui/icon-picker';

interface GoalGroupData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string | null;
}

interface GoalGroupContainerProps {
  group: GoalGroupData;
  goals: Goal[];
  onGoalClick?: (goalId: string) => void;
  onAddGoal?: (groupId: string) => void;
  onEditGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d atrasado`;
  } else if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays <= 7) {
    return `${diffDays}d`;
  } else {
    return format(date, 'dd/MM/yy', { locale: ptBR });
  }
}

// Sub-component for each goal item in the expanded list
function GoalItemInGroup({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 backdrop-blur-md border-border/10 cursor-pointer"
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
        goal.status === 'achieved'
          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      )}>
        {goal.status === 'achieved' ? (
          <Check className="w-4 h-4" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </div>

      {/* Goal Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${goal.color}15`,
          border: `1px solid ${goal.color}30`
        }}
      >
        <Icon3D icon={goal.icon} size="lg" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          goal.status === 'achieved' && "line-through text-muted-foreground"
        )}>
          {goal.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] h-5">
            {goal.goalType === 'project' ? '📁 Projeto' : '📊 Mensurável'}
          </Badge>
          {goal.endDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(goal.endDate)}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 hidden sm:block">
          <Progress value={goal.progress} className="h-1.5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
          {Math.round(goal.progress)}%
        </span>
      </div>
    </motion.div>
  );
}

export function GoalGroupContainer({
  group,
  goals,
  onGoalClick,
  onAddGoal,
  onEditGroup,
  onDeleteGroup,
}: GoalGroupContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Calculations
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'achieved').length;
  const averageProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals)
    : 0;


  return (
    <>
      <Card className="overflow-hidden bg-card/50 backdrop-blur-md border-border/10">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Group Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${group.color}15`,
                  border: `2px solid ${group.color}30`
                }}
              >
                <Icon3D icon={group.icon} size="xl" />
              </div>

              {/* Name + Stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {completedGoals}/{totalGoals}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {averageProgress}%
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {group.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => setShowDetailsModal(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditGroup?.(group.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar grupo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteGroup?.(group.id)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Excluir grupo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

      <CardContent className="pt-0">
        {/* Progress Bar with expand arrow */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={averageProgress} className="h-2" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Metas neste grupo
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddGoal?.(group.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {goals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <p className="text-sm">Nenhuma meta neste grupo</p>
                    <Button
                      variant="link"
                      className="mt-2 text-xs"
                      onClick={() => onAddGoal?.(group.id)}
                    >
                      Adicionar primeira meta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Sort: pending first, then completed */}
                    {[...goals]
                      .sort((a, b) => {
                        if (a.status === 'achieved' && b.status !== 'achieved') return 1;
                        if (a.status !== 'achieved' && b.status === 'achieved') return -1;
                        return 0;
                      })
                      .map(goal => (
                        <GoalItemInGroup
                          key={goal.id}
                          goal={goal}
                          onClick={() => onGoalClick?.(goal.id)}
                        />
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>

    {/* Group Details Modal */}
    <GoalGroupDetailsModal
      groupId={group.id}
      open={showDetailsModal}
      onOpenChange={setShowDetailsModal}
      onGoalClick={onGoalClick}
      onAddGoal={onAddGoal}
      onDelete={() => onDeleteGroup?.(group.id)}
    />
  </>
  );
}
