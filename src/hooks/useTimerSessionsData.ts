import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TimerSession {
  id: string;
  userId: string;
  itemType: 'task' | 'habit';
  itemId: string;
  itemName: string;
  estimatedTime: number | null;
  actualTime: number;
  startedAt: string;
  endedAt: string;
  notes: string | null;
  createdAt: string;
}

interface TimerStats {
  totalSessions: number;
  totalMinutes: number;
  avgSessionTime: number;
  onTimeRate: number;
  topItems: {
    name: string;
    type: 'task' | 'habit';
    totalTime: number;
    sessions: number;
  }[];
  recentSessions: TimerSession[];
}

export function useTimerSessionsData() {
  const { user } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['timer-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('timer_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        itemType: row.item_type as 'task' | 'habit',
        itemId: row.item_id,
        itemName: row.item_name,
        estimatedTime: row.estimated_time,
        actualTime: row.actual_time,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    },
    enabled: !!user,
  });

  const stats: TimerStats = {
    totalSessions: sessions.length,
    totalMinutes: sessions.reduce((sum, s) => sum + s.actualTime, 0),
    avgSessionTime: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.actualTime, 0) / sessions.length) 
      : 0,
    onTimeRate: (() => {
      const sessionsWithEstimate = sessions.filter(s => s.estimatedTime);
      if (sessionsWithEstimate.length === 0) return 0;
      const onTimeCount = sessionsWithEstimate.filter(s => 
        s.estimatedTime && s.actualTime <= s.estimatedTime
      ).length;
      return Math.round((onTimeCount / sessionsWithEstimate.length) * 100);
    })(),
    topItems: (() => {
      const itemsMap = new Map<string, { name: string; type: 'task' | 'habit'; totalTime: number; sessions: number }>();
      sessions.forEach(s => {
        const key = `${s.itemType}-${s.itemId}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            name: s.itemName,
            type: s.itemType,
            totalTime: 0,
            sessions: 0,
          });
        }
        const item = itemsMap.get(key)!;
        item.totalTime += s.actualTime;
        item.sessions += 1;
      });
      return Array.from(itemsMap.values())
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 5);
    })(),
    recentSessions: sessions.slice(0, 10),
  };

  return {
    sessions,
    stats,
    isLoading,
  };
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}
