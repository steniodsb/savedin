import { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, Check, XCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, isYesterday, isToday as isDateToday, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotificationsData, Notification } from '@/hooks/useNotificationsData';
import { useConnectionsData } from '@/hooks/useConnectionsData';
import { useSharedItemsData } from '@/hooks/useSharedItemsData';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { HabitDetailView } from '@/components/habits/HabitDetailView';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';

// ============================================================================
// ICON MAPPING - Converte palavras-chave para emojis
// ============================================================================
const ICON_MAP: Record<string, string> = {
  // Fitness & Health
  muscle: '💪',
  fire: '🔥',
  running: '🏃',
  yoga: '🧘',
  heart: '❤️',
  apple: '🍎',
  water: '💧',
  sleeping: '😴',
  brain: '🧠',
  meditation: '🧘‍♀️',
  
  // Productivity
  target: '🎯',
  check: '✅',
  calendar: '📅',
  clock: '⏰',
  notebook: '📓',
  pencil: '✏️',
  memo: '📝',
  folder: '📁',
  file: '📄',
  clipboard: '📋',
  pushpin: '📌',
  bookmark: '🔖',
  
  // Success
  star: '⭐',
  rocket: '🚀',
  crown: '👑',
  thumbup: '👍',
  bulb: '💡',
  trophy: '🏆',
  medal: '🏅',
  gem: '💎',
  sparkles: '✨',
  hundred: '💯',
  
  // Nature
  leaf: '🌿',
  flower: '🌸',
  sun: '☀️',
  moon: '🌙',
  rainbow: '🌈',
  tree: '🌳',
  
  // Finance
  dollar: '💵',
  money: '💰',
  wallet: '👛',
  creditcard: '💳',
  bank: '🏦',
  
  // Communication
  bell: '🔔',
  chat: '💬',
  email: '📧',
  phone: '📞',
  megaphone: '📢',
  
  // Tech
  computer: '💻',
  mobile: '📱',
  settings: '⚙️',
  shield: '🛡️',
  
  // Education
  book: '📚',
  graduation: '🎓',
  school: '🏫',
  science: '🔬',
  
  // Entertainment
  music: '🎵',
  gamepad: '🎮',
  movie: '🎬',
  art: '🎨',
  party: '🎉',
  gift: '🎁',
  
  // Food
  coffee: '☕',
  pizza: '🍕',
  burger: '🍔',
  cake: '🎂',
  
  // Travel
  house: '🏠',
  car: '🚗',
  plane: '✈️',
  train: '🚆',
  bike: '🚴',
  
  // Sports
  soccer: '⚽',
  basketball: '🏀',
  tennis: '🎾',
  swimming: '🏊',
  
  // Animals
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  fish: '🐟',
  butterfly: '🦋',
  
  // Misc
  love: '💕',
  peace: '☮️',
  luck: '🍀',
  magic: '🪄',
  key: '🔑',
  lock: '🔒',
  tools: '🛠️',
  package: '📦',
  link: '🔗',
  hourglass: '⏳',
};

// Color classes per notification type
const TYPE_COLORS: Record<string, string> = {
  habit: 'text-emerald-500 bg-emerald-500/10',
  task: 'text-blue-500 bg-blue-500/10',
  goal: 'text-purple-500 bg-purple-500/10',
  reminder: 'text-yellow-500 bg-yellow-500/10',
  system: 'text-muted-foreground bg-muted',
  friend_request: 'text-green-500 bg-green-500/10',
  share_invite: 'text-purple-500 bg-purple-500/10',
};

// Default icons per notification type
const TYPE_DEFAULT_ICONS: Record<string, string> = {
  habit: '🔥',
  task: '✅',
  goal: '🎯',
  reminder: '🔔',
  system: '⚙️',
  friend_request: '👋',
  share_invite: '🤝',
};

// ============================================================================
// HELPER: Check if string is an emoji
// ============================================================================
function isEmoji(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  // Simple check: emoji usually starts with high Unicode values
  const code = str.codePointAt(0);
  if (!code) return false;
  // Most emojis are above 0x1F300
  return code > 0x1F00 || (code >= 0x2600 && code <= 0x27BF);
}

// ============================================================================
// HELPER: Extract icon and clean title from notification
// ============================================================================
function getIconAndTitle(notification: Notification): { icon: string; title: string } {
  const rawTitle = notification.title || '';
  const type = notification.type;
  const data = notification.data as Record<string, unknown> | null;
  
  // Priority 1: Check data.icon field
  if (data && data.icon) {
    const iconValue = String(data.icon).trim().toLowerCase();
    
    // Direct emoji in data.icon
    if (isEmoji(data.icon as string)) {
      return { icon: data.icon as string, title: rawTitle };
    }
    
    // Map icon key to emoji
    if (ICON_MAP[iconValue]) {
      return { icon: ICON_MAP[iconValue], title: rawTitle };
    }
  }
  
  // Priority 2: Extract from title prefix
  const parts = rawTitle.split(' ');
  if (parts.length >= 1) {
    const firstWord = parts[0].trim();
    
    // First word is already an emoji
    if (isEmoji(firstWord)) {
      return { 
        icon: firstWord, 
        title: parts.slice(1).join(' ').trim() || rawTitle
      };
    }
    
    // First word maps to an emoji
    const mappedIcon = ICON_MAP[firstWord.toLowerCase()];
    if (mappedIcon && parts.length > 1) {
      return { 
        icon: mappedIcon, 
        title: parts.slice(1).join(' ').trim()
      };
    }
  }
  
  // Priority 3: Use type default
  return { 
    icon: TYPE_DEFAULT_ICONS[type] || '✨', 
    title: rawTitle 
  };
}

// ============================================================================
// HELPER: Smart timestamp formatting
// ============================================================================
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const minutesAgo = differenceInMinutes(now, date);
  const hoursAgo = differenceInHours(now, date);
  
  if (minutesAgo < 1) return 'Agora';
  if (minutesAgo < 60) return `Há ${minutesAgo} min`;
  if (hoursAgo < 24 && isDateToday(date)) return `Há ${hoursAgo}h`;
  if (isYesterday(date)) return 'Ontem';
  
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================
interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
  onAcceptFriend?: (connectionId: string) => void;
  onRejectFriend?: (connectionId: string) => void;
  onAcceptShare?: (sharedItemId: string) => void;
  onRejectShare?: (sharedItemId: string) => void;
  onOpenHabit?: (habitId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenGoal?: (goalId: string) => void;
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
  onAcceptFriend,
  onRejectFriend,
  onAcceptShare,
  onRejectShare,
  onOpenHabit,
  onOpenTask,
  onOpenGoal,
}: NotificationItemProps) {
  const [isActing, setIsActing] = useState(false);
  const data = notification.data as Record<string, unknown> | null;
  
  // Get icon and cleaned title
  const { icon, title } = getIconAndTitle(notification);
  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.system;

  const handleClick = () => {
    if (!notification.read) onRead();
    
    if (notification.type === 'habit' && data?.habitId) {
      onOpenHabit?.(data.habitId as string);
    } else if (notification.type === 'task' && data?.taskId) {
      onOpenTask?.(data.taskId as string);
    } else if (notification.type === 'goal' && data?.goalId) {
      onOpenGoal?.(data.goalId as string);
    }
  };

  const handleAcceptFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.connectionId || isActing) return;
    setIsActing(true);
    try {
      await onAcceptFriend?.(data.connectionId as string);
      onDelete();
    } finally {
      setIsActing(false);
    }
  };

  const handleRejectFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.connectionId || isActing) return;
    setIsActing(true);
    try {
      await onRejectFriend?.(data.connectionId as string);
      onDelete();
    } finally {
      setIsActing(false);
    }
  };

  const handleAcceptShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.sharedItemId || isActing) return;
    setIsActing(true);
    try {
      await onAcceptShare?.(data.sharedItemId as string);
      onDelete();
    } finally {
      setIsActing(false);
    }
  };

  const handleRejectShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data?.sharedItemId || isActing) return;
    setIsActing(true);
    try {
      await onRejectShare?.(data.sharedItemId as string);
      onDelete();
    } finally {
      setIsActing(false);
    }
  };

  // Check if this is a social notification with user avatar
  const isSocialNotification = notification.type === 'friend_request' || notification.type === 'share_invite';
  const avatarUrl = data?.requesterAvatar as string | undefined || data?.ownerAvatar as string | undefined;
  const userName = data?.requesterName as string | undefined || data?.requesterUsername as string | undefined || 
                   data?.ownerName as string | undefined || data?.ownerUsername as string | undefined;
  
  const getInitials = (name?: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'relative flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group',
        notification.read
          ? 'bg-transparent hover:bg-muted/50 opacity-70'
          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      )}
      onClick={handleClick}
    >
      {/* Icon Container - Show avatar for social notifications */}
      <div className="relative shrink-0">
        {isSocialNotification ? (
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className={cn('text-sm font-semibold', colorClass)}>
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl', colorClass)}>
            <span role="img" aria-label="icon">{icon}</span>
          </div>
        )}
        {!notification.read && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm leading-snug',
          notification.read ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'
        )}>
          {title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatTimestamp(notification.created_at)}
        </p>
        
        {/* Friend request actions */}
        {notification.type === 'friend_request' && !notification.read && data?.connectionId && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleAcceptFriend} disabled={isActing}>
              <Check className="h-3 w-3 mr-1" />
              Aceitar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRejectFriend} disabled={isActing}>
              <XCircle className="h-3 w-3 mr-1" />
              Recusar
            </Button>
          </div>
        )}

        {/* Share invite actions */}
        {notification.type === 'share_invite' && !notification.read && data?.sharedItemId && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleAcceptShare} disabled={isActing}>
              <Check className="h-3 w-3 mr-1" />
              Aceitar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRejectShare} disabled={isActing}>
              <XCircle className="h-3 w-3 mr-1" />
              Recusar
            </Button>
          </div>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </Button>
    </motion.div>
  );
}

// ============================================================================
// MAIN NOTIFICATION CENTER COMPONENT
// ============================================================================
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  
  // Detail modal states
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  const { habits, tasks } = useStore();
  
  // Update timestamps every minute when popover is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [open]);
  
  const {
    dbNotifications, 
    unreadDbCount,
    isLoading,
    markAllDbAsRead,
    markDbAsRead,
    deleteDbNotification,
  } = useNotificationsData();

  const { acceptConnection, rejectConnection } = useConnectionsData();
  const { acceptSharedItem, rejectSharedItem } = useSharedItemsData();

  const handleAcceptFriend = async (connectionId: string) => {
    try {
      await acceptConnection(connectionId);
      toast({ title: 'Solicitação aceita', description: 'Agora vocês são amigos!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível aceitar a solicitação', variant: 'destructive' });
    }
  };

  const handleRejectFriend = async (connectionId: string) => {
    try {
      await rejectConnection(connectionId);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível recusar a solicitação', variant: 'destructive' });
    }
  };

  const handleAcceptShare = async (sharedItemId: string) => {
    try {
      await acceptSharedItem(sharedItemId);
      toast({ title: 'Compartilhamento aceito', description: 'Você pode ver o item compartilhado agora' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível aceitar o compartilhamento', variant: 'destructive' });
    }
  };

  const handleRejectShare = async (sharedItemId: string) => {
    try {
      await rejectSharedItem(sharedItemId);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível recusar o compartilhamento', variant: 'destructive' });
    }
  };

  const handleOpenHabit = (habitId: string) => {
    setOpen(false);
    setSelectedHabitId(habitId);
  };

  const handleOpenTask = (taskId: string) => {
    setOpen(false);
    setSelectedTaskId(taskId);
  };

  const handleOpenGoal = (goalId: string) => {
    setOpen(false);
    setSelectedGoalId(goalId);
  };

  const hasNotifications = dbNotifications.length > 0;
  const selectedHabit = selectedHabitId ? habits.find(h => h.id === selectedHabitId) : null;
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
            <Bell className="h-5 w-5" />
            {unreadDbCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                {unreadDbCount > 9 ? '9+' : unreadDbCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Notificações</h3>
              {unreadDbCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                  {unreadDbCount}
                </span>
              )}
            </div>
            {unreadDbCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => markAllDbAsRead()}
              >
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Marcar como lidas
              </Button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : !hasNotifications ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                <AnimatePresence initial={false}>
                  {dbNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={() => markDbAsRead(notification.id)}
                      onDelete={() => deleteDbNotification(notification.id)}
                      onAcceptFriend={handleAcceptFriend}
                      onRejectFriend={handleRejectFriend}
                      onAcceptShare={handleAcceptShare}
                      onRejectShare={handleRejectShare}
                      onOpenHabit={handleOpenHabit}
                      onOpenTask={handleOpenTask}
                      onOpenGoal={handleOpenGoal}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Detail Views */}
      {selectedHabit && (
        <HabitDetailView 
          habit={selectedHabit}
          open={!!selectedHabitId}
          onOpenChange={(open) => !open && setSelectedHabitId(null)}
          onEdit={() => {}}
        />
      )}

      {selectedTaskId && (
        <TaskDetailView
          task={selectedTask}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}

      {selectedGoalId && (
        <GoalDetailsModal
          goalId={selectedGoalId}
          open={!!selectedGoalId}
          onOpenChange={(open) => !open && setSelectedGoalId(null)}
        />
      )}
    </>
  );
}
