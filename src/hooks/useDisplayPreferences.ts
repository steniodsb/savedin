import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '24h' | '12h';
export type FirstDayOfWeek = 0 | 1; // 0 = Sunday, 1 = Monday

export interface DisplayPreferences {
  firstDayOfWeek: FirstDayOfWeek;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
}

const STORAGE_KEY = 'savedin-display-preferences';

const DEFAULT_PREFERENCES: DisplayPreferences = {
  firstDayOfWeek: 0,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
};

function loadLocalPreferences(): DisplayPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

function saveLocalPreferences(preferences: DisplayPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent('display-preferences-changed', { detail: preferences }));
}

export function useDisplayPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DisplayPreferences>(loadLocalPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Load preferences from database when user is authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setPreferences(loadLocalPreferences());
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_day_of_week, date_format, time_format')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const dbPreferences: DisplayPreferences = {
            firstDayOfWeek: (data.first_day_of_week ?? 0) as FirstDayOfWeek,
            dateFormat: (data.date_format ?? 'DD/MM/YYYY') as DateFormat,
            timeFormat: (data.time_format ?? '24h') as TimeFormat,
          };
          setPreferences(dbPreferences);
          saveLocalPreferences(dbPreferences);
          setIsSynced(true);
        }
      } catch (error) {
        console.error('Error loading display preferences:', error);
        setPreferences(loadLocalPreferences());
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Listen for preference changes from other components
  useEffect(() => {
    const handleChange = (e: CustomEvent<DisplayPreferences>) => {
      setPreferences(e.detail);
    };

    window.addEventListener('display-preferences-changed', handleChange as EventListener);
    return () => {
      window.removeEventListener('display-preferences-changed', handleChange as EventListener);
    };
  }, []);

  const updatePreference = useCallback(async <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    saveLocalPreferences(newPreferences);

    if (user?.id) {
      try {
        const columnMap: Record<keyof DisplayPreferences, string> = {
          firstDayOfWeek: 'first_day_of_week',
          dateFormat: 'date_format',
          timeFormat: 'time_format',
        };

        await supabase
          .from('profiles')
          .update({ [columnMap[key]]: value })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving display preference:', error);
      }
    }
  }, [preferences, user?.id]);

  const saveAllPreferences = useCallback(async (newPreferences: DisplayPreferences) => {
    setPreferences(newPreferences);
    saveLocalPreferences(newPreferences);

    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({
            first_day_of_week: newPreferences.firstDayOfWeek,
            date_format: newPreferences.dateFormat,
            time_format: newPreferences.timeFormat,
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving display preferences:', error);
      }
    }
  }, [user?.id]);

  return {
    preferences,
    isLoading,
    isSynced,
    updatePreference,
    saveAllPreferences,
  };
}

// Utility function to format date based on user preference
export function formatDateWithPreference(date: Date, format: DateFormat): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return format === 'DD/MM/YYYY' 
    ? `${day}/${month}/${year}` 
    : `${month}/${day}/${year}`;
}

// Utility function to format time based on user preference
export function formatTimeWithPreference(date: Date, format: TimeFormat): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}
