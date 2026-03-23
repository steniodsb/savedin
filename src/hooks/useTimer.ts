import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type TimerItem = {
  id: string;
  type: 'task' | 'habit';
  name: string;
  estimatedTime?: number; // minutos
};

export type ActiveTimer = TimerItem & {
  startedAt: Date;
  elapsedSeconds: number;
  isPaused: boolean;
  pausedAt?: Date;
  accumulatedSeconds: number; // Time accumulated before pause
};

const MAX_TIMERS = 2;
const STORAGE_KEY = 'active_timers';

export function useTimer() {
  const { user } = useAuth();
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Carregar timers ativos do localStorage ao montar
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const timers = JSON.parse(saved);
        setActiveTimers(timers.map((t: any) => {
          const startedAt = new Date(t.startedAt);
          const isPaused = t.isPaused || false;
          const accumulatedSeconds = t.accumulatedSeconds || 0;
          
          // Calculate elapsed seconds based on pause state
          let elapsedSeconds: number;
          if (isPaused) {
            elapsedSeconds = accumulatedSeconds;
          } else {
            elapsedSeconds = accumulatedSeconds + Math.floor((Date.now() - startedAt.getTime()) / 1000);
          }
          
          return {
            ...t,
            startedAt,
            elapsedSeconds,
            isPaused,
            pausedAt: t.pausedAt ? new Date(t.pausedAt) : undefined,
            accumulatedSeconds,
          };
        }));
      } catch (error) {
        console.error('Erro ao carregar timers:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Salvar timers no localStorage quando mudar
  useEffect(() => {
    if (activeTimers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTimers));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeTimers]);

  // Start/stop interval based on timer state - using functional update to avoid stale closure
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Create interval that updates only running timers
    intervalRef.current = setInterval(() => {
      setActiveTimers(prev => {
        // Check if we have any running timers
        const hasRunning = prev.some(t => !t.isPaused);
        if (!hasRunning) return prev;

        return prev.map(timer => {
          if (timer.isPaused) {
            return timer; // Don't update paused timers
          }
          return {
            ...timer,
            elapsedSeconds: timer.accumulatedSeconds + Math.floor((Date.now() - timer.startedAt.getTime()) / 1000)
          };
        });
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty dependency - interval runs always, but only updates running timers

  const startTimer = useCallback(async (item: TimerItem) => {
    console.log('startTimer called with:', item);
    
    // Check limits using functional update pattern
    let canStart = true;
    let alreadyExists = false;
    
    setActiveTimers(prev => {
      if (prev.length >= MAX_TIMERS) {
        canStart = false;
        return prev;
      }
      if (prev.some(t => t.id === item.id && t.type === item.type)) {
        alreadyExists = true;
        return prev;
      }
      return prev; // Return unchanged, actual add happens below
    });

    // Wait a tick to get the latest state check results
    await new Promise(resolve => setTimeout(resolve, 0));

    if (!canStart) {
      toast.error('Você já tem 2 cronômetros ativos', {
        description: 'Pare um cronômetro para iniciar outro'
      });
      return false;
    }

    if (alreadyExists) {
      toast.error('Já existe um cronômetro ativo para este item');
      return false;
    }

    // Marcar no banco que o timer está rodando
    const table = item.type === 'task' ? 'tasks' : 'habits';
    const { error } = await supabase
      .from(table)
      .update({ 
        timer_running: true,
        timer_started_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao iniciar timer:', error);
      toast.error('Erro ao iniciar cronômetro');
      return false;
    }

    // Adicionar aos timers ativos
    const newTimer: ActiveTimer = {
      ...item,
      startedAt: new Date(),
      elapsedSeconds: 0,
      isPaused: false,
      accumulatedSeconds: 0,
    };

    setActiveTimers(prev => {
      // Double check we can still add
      if (prev.length >= MAX_TIMERS) return prev;
      if (prev.some(t => t.id === item.id && t.type === item.type)) return prev;
      return [...prev, newTimer];
    });
    
    console.log('Timer started successfully');
    toast.success('Cronômetro iniciado! ⏱️');
    return true;
  }, []);

  const pauseTimer = useCallback(async (itemId: string, itemType: 'task' | 'habit') => {
    console.log('pauseTimer called:', itemId, itemType);
    
    setActiveTimers(prev => {
      const timer = prev.find(t => t.id === itemId && t.type === itemType);
      if (!timer || timer.isPaused) return prev;

      // Calculate current elapsed time
      const currentElapsed = timer.accumulatedSeconds + Math.floor((Date.now() - timer.startedAt.getTime()) / 1000);

      return prev.map(t => {
        if (t.id === itemId && t.type === itemType) {
          return {
            ...t,
            isPaused: true,
            pausedAt: new Date(),
            accumulatedSeconds: currentElapsed,
            elapsedSeconds: currentElapsed,
          };
        }
        return t;
      });
    });

    toast.info('Cronômetro pausado ⏸️');
    return true;
  }, []);

  const resumeTimer = useCallback(async (itemId: string, itemType: 'task' | 'habit') => {
    console.log('resumeTimer called:', itemId, itemType);
    
    setActiveTimers(prev => {
      const timer = prev.find(t => t.id === itemId && t.type === itemType);
      if (!timer || !timer.isPaused) return prev;

      return prev.map(t => {
        if (t.id === itemId && t.type === itemType) {
          return {
            ...t,
            isPaused: false,
            startedAt: new Date(), // Reset startedAt to now
            pausedAt: undefined,
            // accumulatedSeconds remains the same, will continue from there
          };
        }
        return t;
      });
    });

    toast.success('Cronômetro retomado ▶️');
    return true;
  }, []);

  const stopTimer = useCallback(async (itemId: string, itemType: 'task' | 'habit', saveNotes?: string) => {
    console.log('stopTimer called:', itemId, itemType);
    
    if (!user) return false;
    
    // Get timer data before removing
    let timerData: ActiveTimer | null = null;
    setActiveTimers(prev => {
      timerData = prev.find(t => t.id === itemId && t.type === itemType) || null;
      return prev; // Don't remove yet
    });

    // Wait a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    if (!timerData) {
      console.log('Timer not found');
      return false;
    }

    const actualMinutes = Math.max(1, Math.ceil(timerData.elapsedSeconds / 60));

    try {
      // Salvar sessão no histórico
      const { error: sessionError } = await supabase
        .from('timer_sessions')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          item_name: timerData.name,
          estimated_time: timerData.estimatedTime || null,
          actual_time: actualMinutes,
          started_at: timerData.startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          notes: saveNotes || null,
        });

      if (sessionError) throw sessionError;

      // Buscar tempo atual e atualizar
      const table = itemType === 'task' ? 'tasks' : 'habits';
      const { data: currentData } = await supabase
        .from(table)
        .select('total_time_spent')
        .eq('id', itemId)
        .single();

      const currentTime = currentData?.total_time_spent || 0;

      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          timer_running: false,
          timer_started_at: null,
          total_time_spent: currentTime + actualMinutes
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Remover dos timers ativos
      setActiveTimers(prev => prev.filter(t => !(t.id === itemId && t.type === itemType)));

      // Mostrar resumo
      const estimated = timerData.estimatedTime || 0;
      const diff = estimated > 0 ? actualMinutes - estimated : 0;
      const performance = estimated > 0
        ? diff <= 0 
          ? `✅ ${Math.abs(diff)}min mais rápido!` 
          : `⚠️ ${diff}min a mais`
        : '';

      toast.success('Cronômetro parado', {
        description: `Tempo: ${actualMinutes}min ${performance}`,
        duration: 5000,
      });

      return true;
    } catch (error) {
      console.error('Erro ao parar timer:', error);
      toast.error('Erro ao parar cronômetro');
      return false;
    }
  }, [user]);

  const cancelTimer = useCallback(async (itemId: string, itemType: 'task' | 'habit') => {
    console.log('cancelTimer called:', itemId, itemType);
    
    // Check if timer exists
    let exists = false;
    setActiveTimers(prev => {
      exists = prev.some(t => t.id === itemId && t.type === itemType);
      return prev;
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    if (!exists) return false;

    // Atualizar no banco sem salvar sessão
    const table = itemType === 'task' ? 'tasks' : 'habits';
    await supabase
      .from(table)
      .update({ 
        timer_running: false,
        timer_started_at: null
      })
      .eq('id', itemId);

    setActiveTimers(prev => prev.filter(t => !(t.id === itemId && t.type === itemType)));
    toast.info('Cronômetro cancelado');
    return true;
  }, []);

  const getTimerForItem = useCallback((itemId: string, itemType: 'task' | 'habit') => {
    return activeTimers.find(t => t.id === itemId && t.type === itemType);
  }, [activeTimers]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    activeTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer,
    getTimerForItem,
    formatTime,
    canStartTimer: activeTimers.length < MAX_TIMERS,
    maxTimers: MAX_TIMERS,
  };
}
