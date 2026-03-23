import { motion, AnimatePresence } from 'framer-motion';
import { Goal, goalCategoryConfig, getGoalPeriodLabel } from '@/types';
import { ChevronDown, Plus, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Icon3D } from '@/components/ui/icon-picker';
import { GoalCard } from './GoalCard';
import { Progress } from '@/components/ui/progress';

interface GoalGroupCardProps {
  goal: Goal;
  isExpanded: boolean;
  onToggle: () => void;
  onGoalClick: (goal: Goal) => void;
  onAddSubgoal: (parentId: string) => void;
}

const colorAccents: Record<string, { gradient: string; glow: string; badge: string }> = {
  blue: { 
    gradient: 'from-[hsl(217_91%_60%/0.15)] to-[hsl(217_91%_60%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(217_91%_60%/0.15)]',
    badge: 'bg-[hsl(217_91%_60%/0.2)] text-[hsl(217_91%_60%)]'
  },
  green: { 
    gradient: 'from-[hsl(142_71%_45%/0.15)] to-[hsl(142_71%_45%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(142_71%_45%/0.15)]',
    badge: 'bg-[hsl(142_71%_45%/0.2)] text-[hsl(142_71%_45%)]'
  },
  yellow: { 
    gradient: 'from-[hsl(43_96%_56%/0.15)] to-[hsl(43_96%_56%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(43_96%_56%/0.15)]',
    badge: 'bg-[hsl(43_96%_56%/0.2)] text-[hsl(43_96%_56%)]'
  },
  purple: { 
    gradient: 'from-[hsl(262_83%_66%/0.15)] to-[hsl(262_83%_66%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(262_83%_66%/0.15)]',
    badge: 'bg-[hsl(262_83%_66%/0.2)] text-[hsl(262_83%_66%)]'
  },
  orange: { 
    gradient: 'from-[hsl(25_95%_53%/0.15)] to-[hsl(25_95%_53%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(25_95%_53%/0.15)]',
    badge: 'bg-[hsl(25_95%_53%/0.2)] text-[hsl(25_95%_53%)]'
  },
  pink: { 
    gradient: 'from-[hsl(330_81%_60%/0.15)] to-[hsl(330_81%_60%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(330_81%_60%/0.15)]',
    badge: 'bg-[hsl(330_81%_60%/0.2)] text-[hsl(330_81%_60%)]'
  },
  red: { 
    gradient: 'from-[hsl(0_84%_60%/0.15)] to-[hsl(0_84%_60%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(0_84%_60%/0.15)]',
    badge: 'bg-[hsl(0_84%_60%/0.2)] text-[hsl(0_84%_60%)]'
  },
  teal: { 
    gradient: 'from-[hsl(168_76%_42%/0.15)] to-[hsl(168_76%_42%/0.05)]', 
    glow: 'shadow-[0_0_20px_hsl(168_76%_42%/0.15)]',
    badge: 'bg-[hsl(168_76%_42%/0.2)] text-[hsl(168_76%_42%)]'
  },
};

export function GoalGroupCard({ goal, isExpanded, onToggle, onGoalClick, onAddSubgoal }: GoalGroupCardProps) {
  const { goals } = useStore();
  const categoryConfig = goalCategoryConfig[goal.category];
  const styles = colorAccents[goal.color] || colorAccents.purple;
  
  // Get children
  const childGoals = goals.filter(g => goal.childrenIds?.includes(g.id));
  const childrenCount = childGoals.length;
  const completedChildren = childGoals.filter(g => g.status === 'achieved').length;
  
  // Calculate average progress
  const avgProgress = childGoals.length > 0 
    ? Math.round(childGoals.reduce((acc, g) => acc + g.progress, 0) / childGoals.length)
    : goal.progress;

  const periodLabel = getGoalPeriodLabel(goal.startDate, goal.endDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-2xl border border-border/10 overflow-hidden relative',
        'bg-card/50 backdrop-blur-md',
        isExpanded && styles.glow
      )}
    >
      {/* Group indicator badge */}
      <div className="absolute top-2 right-2 z-10">
        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
          styles.badge
        )}>
          <FolderTree className="w-3 h-3" />
          <span>Grupo</span>
        </div>
      </div>

      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-background/20 transition-colors"
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center shrink-0 border border-border/10">
          <Icon3D icon={goal.icon} size="lg" />
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 pr-16">
            <h3 className="font-bold text-foreground text-base line-clamp-1">{goal.title}</h3>
            {goal.status === 'achieved' && (
              <span className="px-1.5 py-0.5 rounded-full bg-status-completed/20 text-status-completed text-[10px] shrink-0">
                ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>{categoryConfig.icon}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{periodLabel}</span>
          </div>
          
          {/* Submetas progress indicator */}
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex-1">
              <Progress value={avgProgress} className="h-2" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-foreground">{avgProgress}%</span>
              <span className="text-muted-foreground">
                ({completedChildren}/{childrenCount})
              </span>
            </div>
          </div>
        </div>
        
        {/* Expand/collapse */}
        <div className="shrink-0">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>
      
      {/* Children */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border/10 pt-3 bg-background/30">
              {/* Subgoals */}
              {childGoals.map(child => (
                <GoalCard key={child.id} goal={child} onClick={() => onGoalClick(child)} />
              ))}
              
              {/* Add subgoal button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubgoal(goal.id);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar submeta</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}