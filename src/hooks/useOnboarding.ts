import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingState {
  isOnboardingComplete: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const { user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true); // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOnboardingStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching onboarding status:', error);
        setIsOnboardingComplete(true); // Assume complete on error to not block user
      } else if (data === null) {
        // Profile doesn't exist yet (new database without trigger)
        // Don't block the user, assume onboarding complete
        console.warn('[Onboarding] Profile not found for user, assuming complete');
        setIsOnboardingComplete(true);
      } else {
        setIsOnboardingComplete(data?.onboarding_completed ?? false);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsOnboardingComplete(true);
    } finally {
      setIsLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  useEffect(() => {
    // Safety timeout - ensure loading completes within 8 seconds
    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn('[Onboarding] Safety timeout reached, assuming complete');
        setIsOnboardingComplete(true);
        setIsLoading(false);
      }
    }, 8000);

    fetchOnboardingStatus();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
    refetch: fetchOnboardingStatus,
  };
}
