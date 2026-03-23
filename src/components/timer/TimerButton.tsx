import { Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTimer, TimerItem } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';

interface TimerButtonProps {
  item: TimerItem;
  size?: 'sm' | 'md';
  className?: string;
}

export function TimerButton({ item, size = 'sm', className }: TimerButtonProps) {
  const { startTimer, getTimerForItem, formatTime, canStartTimer } = useTimer();
  const activeTimer = getTimerForItem(item.id, item.type);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('TimerButton clicked', { item, activeTimer, canStartTimer });
    
    if (activeTimer) {
      // Timer já rodando - não faz nada, usuário deve usar o floating timer para parar
      console.log('Timer already active, ignoring click');
      return;
    }
    
    console.log('Starting timer...');
    const result = await startTimer(item);
    console.log('Timer start result:', result);
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2';

  if (activeTimer) {
    return (
      <motion.button
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        onClick={handleClick}
        className={cn(
          buttonSize,
          'rounded-lg bg-primary/20 text-primary flex items-center gap-1.5',
          className
        )}
        title="Cronômetro ativo"
      >
        <Clock className={cn(iconSize, 'animate-pulse')} />
        <span className="text-xs font-mono font-medium">
          {formatTime(activeTimer.elapsedSeconds)}
        </span>
      </motion.button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!canStartTimer}
      className={cn(
        buttonSize,
        'rounded-lg transition-colors',
        canStartTimer 
          ? 'hover:bg-muted text-muted-foreground hover:text-foreground' 
          : 'text-muted-foreground/50 cursor-not-allowed',
        className
      )}
      title={canStartTimer ? 'Iniciar cronômetro' : 'Limite de 2 cronômetros atingido'}
    >
      <Play className={iconSize} />
    </button>
  );
}
