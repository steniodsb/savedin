// Goal types - unified (replaces old Projects + Goals)
export type GoalType = 'project' | 'measurable';
export type GoalScope = 'personal' | 'professional' | 'financial' | 'health' | 'relationship' | 'education';
export type GoalCategory = "career" | "health" | "finance" | "learning" | "personal" | "relationships";
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "abandoned";

// Task types
export type TaskLevel = "milestone" | "task" | "subtask";

export interface Task {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  status: "pending" | "in_progress" | "blocked" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  level: TaskLevel;
  levelLabel: string;
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  totalTimeSpent?: number;
  timerRunning?: boolean;
  timerStartedAt?: string;
  parentId: string | null;
  projectId?: string;
  categoryId?: string;
  depth: number;
  dependencies: string[];
  dependents: string[];
  blockedBy: string[];
  childrenIds: string[];
  childrenCount: number;
  completedChildrenCount: number;
  createdAt: string;
  completedAt?: string;
  scheduledFor?: string;
  notes?: string;
  tags?: string[];
  linkedGoalId?: string;
  goalWeight?: number;
  isArchived: boolean;
  assignees?: string[];
}

// Habit types
export type HabitColor = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "purple" | "pink";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type HabitFrequency = "daily" | "weekly" | "specific_days" | "interval";
export type HabitTrackingType = "simple" | "quantitative" | "checklist";
export type HabitContributionType = "none" | "simple" | "custom" | "milestone";

export interface Habit {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: HabitColor;
  frequency: HabitFrequency;
  daysOfWeek?: number[];
  intervalDays?: number;
  timesPerDay: number;
  timeOfDay: TimeOfDay;
  specificTime?: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  goalType?: "streak" | "total" | "weekly";
  goalTarget?: number;
  routineId?: string;
  orderInRoutine?: number;
  createdAt: string;
  isActive: boolean;
  linkedGoalId?: string;
  categoryId?: string;
  estimatedMinutes?: number;
  totalTimeSpent?: number;
  timerRunning?: boolean;
  timerStartedAt?: string;
  // Tracking type support
  trackingType?: HabitTrackingType;
  targetValue?: number;
  unit?: string;
  customUnit?: string;
  checklistItems?: string[];
  // Contribution to linked goal
  contributionType?: HabitContributionType;
  contributionValue?: number;
  requireAllItems?: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completedAt: string;
  count: number;
  notes?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  // For quantitative tracking - store actual value achieved
  value?: number;
  // For checklist tracking - store which items were completed
  completedItems?: string[];
}

export interface Routine {
  id: string;
  title: string;
  description?: string;
  icon: string;
  timeOfDay: TimeOfDay;
  habitIds: string[];
  estimatedMinutes: number;
  allowSkip: boolean;
  isActive: boolean;
}

export interface GoalMilestone {
  id: string;
  title: string;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  categoryId?: string;
  groupId?: string; // Reference to goal_groups table
  icon: string;
  color: string;
  // Goal type: 'project' for complex goals, 'measurable' for numeric goals
  goalType: GoalType;
  // Scope classification
  scope?: GoalScope;
  // Flexible dates
  startDate?: string;
  endDate?: string;
  // Hierarchy support
  parentId?: string | null;
  depth: number;
  childrenIds: string[];
  // Goal tracking - used by both types
  isMeasurable: boolean;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  valueUnit?: string; // Display unit: "R$", "kg", "km", etc
  // Direction: true for goals where lower is better (weight loss), false for higher is better (savings)
  isDescending?: boolean;
  milestones: GoalMilestone[];
  // Task connections with weights (for project-type goals)
  linkedTaskIds?: string[];
  status: GoalStatus;
  progress: number;
  createdAt: string;
  achievedAt?: string;
}

// Legacy alias for backward compatibility
export type YearlyGoal = Goal;

// Legacy Project type - redirects to Goal
export type Project = Goal;

// View types
export type ViewMode = "hierarchy" | "kanban" | "timeline" | "list";
export type TabType = "today" | "habits" | "tasks" | "mindmap" | "goals" | "reminders" | "calendar" | "reports" | "friends" | "trash" | "settings";

// Scope configuration
export const goalScopeConfig: Record<GoalScope, { label: string; icon: string; color: string }> = {
  personal: { label: "Pessoal", icon: "🌟", color: "blue" },
  professional: { label: "Profissional", icon: "💼", color: "purple" },
  financial: { label: "Financeiro", icon: "💰", color: "yellow" },
  health: { label: "Saúde", icon: "💪", color: "green" },
  relationship: { label: "Relacionamentos", icon: "❤️", color: "pink" },
  education: { label: "Educação", icon: "📚", color: "orange" },
};

// Goal category config
export const goalCategoryConfig: Record<GoalCategory, { label: string; icon: string; color: string }> = {
  career: { label: "Carreira", icon: "💼", color: "blue" },
  health: { label: "Saúde", icon: "💪", color: "green" },
  finance: { label: "Finanças", icon: "💰", color: "yellow" },
  learning: { label: "Aprendizado", icon: "📚", color: "purple" },
  personal: { label: "Pessoal", icon: "🎯", color: "orange" },
  relationships: { label: "Relacionamentos", icon: "❤️", color: "pink" },
};

// Helper to get period label from dates
export function getGoalPeriodLabel(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'Sem prazo';
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  
  if (start && end) {
    // Check if same year
    if (start.getFullYear() === end.getFullYear()) {
      // Check if full year
      if (start.getMonth() === 0 && end.getMonth() === 11) {
        return `${start.getFullYear()}`;
      }
      // Same year, different months
      return `${start.toLocaleDateString('pt-BR', { month: 'short' })} - ${end.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
  }
  
  if (start) return `A partir de ${formatDate(start)}`;
  if (end) return `Até ${formatDate(end)}`;
  
  return 'Sem prazo';
}
