import { motion } from 'framer-motion';
import { Goal, goalCategoryConfig, getGoalPeriodLabel } from '@/types';
import { ChevronRight, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/store/useStore';
import { useGradientColors } from '@/hooks/useGradientColors';
import { Icon3D, ICONS } from '@/components/ui/icon-picker';
import { SharedItemsBadge } from '@/components/shared/SharedItemsBadge';

interface GoalCardProps {
  goal: Goal;
  onClick?: () => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const { goals } = useStore();
  const { color1: systemColor } = useGradientColors();
  const categoryConfig = goalCategoryConfig[goal.category];
  
  // Get effective color (system color if null)
  const effectiveColor = goal.color || systemColor;
  
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
  const nextMilestone = goal.milestones.find((m) => !m.isCompleted);
  const hasChildren = goal.childrenIds && goal.childrenIds.length > 0;
  const childrenCount = goal.childrenIds?.length || 0;
  
  // Calculate children progress
  const childGoals = goals.filter(g => goal.childrenIds?.includes(g.id));
  const childrenProgress = childGoals.length > 0 
    ? Math.round(childGoals.reduce((acc, g) => acc + g.progress, 0) / childGoals.length)
    : 0;

  const periodLabel = getGoalPeriodLabel(goal.startDate, goal.endDate);

  const getQuarterLabel = (quarter?: 1 | 2 | 3 | 4, month?: number) => {
    if (quarter) return `Q${quarter}`;
    if (month) return new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'short' });
    return '';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-xl cursor-pointer',
        'bg-card/50 backdrop-blur-md border border-border/10',
        goal.status === 'achieved' && 'opacity-20 grayscale bg-muted/20'
      )}
    >
        <div className="flex items-center gap-3">
          {/* Icon - only show if icon exists and is not 'none' */}
          {goal.icon && goal.icon !== 'none' && (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${effectiveColor}20` }}
            >
              <Icon3D icon={goal.icon} size="lg" />
            </div>
          )}
          
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground text-sm line-clamp-1">{goal.title}</h3>
              {goal.status === 'achieved' && (
                <span className="px-1.5 py-0.5 rounded-full bg-status-completed/20 text-status-completed text-[10px] shrink-0">
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
              <span className="truncate">{periodLabel}</span>
              {goal.isMeasurable && goal.targetValue && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-foreground/70">
                    {goal.currentValue?.toLocaleString('pt-BR')}/{goal.targetValue.toLocaleString('pt-BR')}
                  </span>
                </>
              )}
              {goal.milestones.length > 0 && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-foreground/70">
                    {completedMilestones}/{goal.milestones.length} marcos
                  </span>
                </>
              )}
            </div>
            
            {/* Tags row */}
            {hasChildren && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/30 text-secondary-foreground text-[10px] font-medium">
                        <FolderTree className="h-2.5 w-2.5" />
                        {childrenCount}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {childrenCount} submeta{childrenCount > 1 ? 's' : ''} ({childrenProgress}% progresso)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          
          {/* Progress + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <SharedItemsBadge itemId={goal.id} showAvatars size="sm" />
            <span className="text-xs font-medium text-muted-foreground w-8 text-right">{goal.progress}%</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

    </motion.div>
  );
}