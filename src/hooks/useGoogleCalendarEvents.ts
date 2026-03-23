import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  allDay: boolean;
  color?: string;
  location?: string;
  description?: string;
}

export function useGoogleCalendarEvents(dateStr: string) {
  const [isConnected, setIsConnected] = useState(false);

  // Check if user has Google Calendar connected
  useEffect(() => {
    const checkConnection = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        // User has a Google token available
        setIsConnected(true);
      }
    };
    checkConnection();
  }, []);

  const { data: events = [] } = useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google-calendar-events', dateStr],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) return [];

      try {
        const timeMin = `${dateStr}T00:00:00Z`;
        const timeMax = `${dateStr}T23:59:59Z`;

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
            },
          }
        );

        if (!response.ok) {
          console.warn('Google Calendar API error:', response.status);
          return [];
        }

        const data = await response.json();
        
        return (data.items || []).map((item: any) => {
          const isAllDay = !!item.start?.date;
          let startTime: string | undefined;
          let endTime: string | undefined;

          if (!isAllDay && item.start?.dateTime) {
            const start = new Date(item.start.dateTime);
            startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
          }
          if (!isAllDay && item.end?.dateTime) {
            const end = new Date(item.end.dateTime);
            endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
          }

          return {
            id: item.id,
            title: item.summary || '(Sem título)',
            startTime,
            endTime,
            allDay: isAllDay,
            color: item.colorId,
            location: item.location,
            description: item.description,
          };
        });
      } catch (error) {
        console.warn('Failed to fetch Google Calendar events:', error);
        return [];
      }
    },
    enabled: isConnected,
    staleTime: 5 * 60 * 1000,
  });

  return { events, isConnected };
}
