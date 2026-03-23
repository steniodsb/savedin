import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'savedin_visual_effects_enabled';

// Global state for immediate access
let globalVisualEffectsEnabled = true;

// Apply the visual effects attribute to the document
function applyVisualEffectsAttribute(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) {
    root.removeAttribute('data-visual-effects');
  } else {
    root.setAttribute('data-visual-effects', 'disabled');
  }
}

// Initialize from localStorage immediately on module load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    globalVisualEffectsEnabled = stored === 'true';
    applyVisualEffectsAttribute(globalVisualEffectsEnabled);
  }
}

export function useVisualEffects() {
  const { user } = useAuth();
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState<boolean>(() => {
    // First try localStorage for immediate access
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      globalVisualEffectsEnabled = stored === 'true';
      return stored === 'true';
    }
    return true; // Default to enabled
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load from database on mount
  useEffect(() => {
    async function loadFromDatabase() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('visual_effects_enabled')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading visual effects setting:', error);
          return;
        }

        const enabled = data?.visual_effects_enabled ?? true;
        setVisualEffectsEnabled(enabled);
        globalVisualEffectsEnabled = enabled;
        localStorage.setItem(STORAGE_KEY, String(enabled));
        applyVisualEffectsAttribute(enabled);
      } catch (error) {
        console.error('Error loading visual effects setting:', error);
      }
    }

    loadFromDatabase();
  }, [user?.id]);

  // Listen for changes from other components
  useEffect(() => {
    const handleVisualEffectsChange = (e: CustomEvent<{ enabled: boolean }>) => {
      setVisualEffectsEnabled(e.detail.enabled);
      globalVisualEffectsEnabled = e.detail.enabled;
      applyVisualEffectsAttribute(e.detail.enabled);
    };

    window.addEventListener('savedin_visual_effects_change', handleVisualEffectsChange as EventListener);
    return () => {
      window.removeEventListener('savedin_visual_effects_change', handleVisualEffectsChange as EventListener);
    };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!user?.id) return;

    setIsLoading(true);
    
    // Update local state immediately for responsiveness
    setVisualEffectsEnabled(enabled);
    globalVisualEffectsEnabled = enabled;
    localStorage.setItem(STORAGE_KEY, String(enabled));
    applyVisualEffectsAttribute(enabled);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('savedin_visual_effects_change', { detail: { enabled } }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ visual_effects_enabled: enabled })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving visual effects setting:', error);
        // Revert on error
        setVisualEffectsEnabled(!enabled);
        globalVisualEffectsEnabled = !enabled;
        localStorage.setItem(STORAGE_KEY, String(!enabled));
        applyVisualEffectsAttribute(!enabled);
      }
    } catch (error) {
      console.error('Error saving visual effects setting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    visualEffectsEnabled,
    setVisualEffectsEnabled: setEnabled,
    isLoading,
  };
}

// Export global getter for components that need immediate access without hook
export function getVisualEffectsEnabled(): boolean {
  return globalVisualEffectsEnabled;
}

// Export global setter for components that need to set without hook (like onboarding)
export function setVisualEffectsEnabled(enabled: boolean): void {
  globalVisualEffectsEnabled = enabled;
  localStorage.setItem(STORAGE_KEY, String(enabled));
  applyVisualEffectsAttribute(enabled);
  
  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('savedin_visual_effects_change', { detail: { enabled } }));
}
